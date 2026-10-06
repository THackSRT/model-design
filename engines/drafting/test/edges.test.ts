import { describe, expect, it } from 'vitest';
import { extractContour } from '../src/core/contour.js';
import { assertCoverage, resolveEdges } from '../src/core/edges.js';
import { CoverageError, EdgeNotFoundError } from '../src/core/errors.js';
import type { EdgeSheet } from '../src/core/sheet.js';
import type { PathOp, PointMm } from '../src/core/types.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

/** Contour de 200 × 100 mm à six sommets A à F, dans le sens de ses segments. */
const POINTS: Record<string, PointMm> = {
  A: p(0, 0),
  B: p(100, 0),
  C: p(200, 0),
  D: p(200, 100),
  E: p(100, 100),
  F: p(0, 100),
  middle: p(50, 0), // sur le contour, mais pas un sommet
};
const ORDER = ['A', 'B', 'C', 'D', 'E', 'F'] as const;
const OPS: PathOp[] = [
  { type: 'move', to: POINTS.A as PointMm },
  ...ORDER.slice(1).map((name): PathOp => ({ type: 'line', to: POINTS[name] as PointMm })),
  { type: 'close' },
];
const CONTOUR = extractContour('boîte', OPS);

const edge = (id: string, from: string, to: string, via?: string[]): EdgeSheet => ({
  id,
  semanticRole: 'styleLine',
  from,
  to,
  via,
});
const SHEET: EdgeSheet[] = [
  edge('top', 'A', 'C', ['B']),
  edge('right', 'C', 'D'),
  edge('bottom', 'D', 'F', ['E']),
  edge('left', 'F', 'A'),
];

describe('resolveEdges', () => {
  it('retrouve chaque bord : sommets, segments dans l’ordre du contour, longueur', () => {
    const edges = resolveEdges('boîte', SHEET, CONTOUR, POINTS);
    expect(edges.map((e) => [e.id, e.fromVertex, e.toVertex, e.segments, e.lengthMm])).toEqual([
      ['top', 0, 2, [0, 1], 200],
      ['right', 2, 3, [2], 100],
      ['bottom', 3, 5, [3, 4], 200],
      ['left', 5, 0, [5], 100],
    ]);
    expect(edges[0]).toMatchObject({ fromPoint: 'A', toPoint: 'C', semanticRole: 'styleLine' });
  });

  it('passe par le sommet 0 quand le bord boucle (de F à B)', () => {
    const [wrapped] = resolveEdges('boîte', [edge('wrap', 'F', 'B')], CONTOUR, POINTS);
    expect(wrapped?.segments).toEqual([5, 0]);
    expect(wrapped?.lengthMm).toBe(200);
  });

  it('suit le sens du contour : de C à A, par D, E et F', () => {
    const [long] = resolveEdges('boîte', [edge('long', 'C', 'A')], CONTOUR, POINTS);
    expect(long?.segments).toEqual([2, 3, 4, 5]);
  });

  it('refuse un point absent de la pièce', () => {
    const attempt = (): unknown =>
      resolveEdges('boîte', [edge('lost', 'A', 'nowhere')], CONTOUR, POINTS);
    expect(attempt).toThrow(EdgeNotFoundError);
    expect(attempt).toThrow('point "nowhere" does not exist');
  });

  it('refuse un point qui n’est pas un sommet du contour', () => {
    const attempt = (): unknown =>
      resolveEdges('boîte', [edge('mid', 'A', 'middle')], CONTOUR, POINTS);
    expect(attempt).toThrow('point "middle" is not a vertex');
  });

  it('refuse un bord d’un sommet à lui-même', () => {
    const attempt = (): unknown => resolveEdges('boîte', [edge('loop', 'A', 'A')], CONTOUR, POINTS);
    expect(attempt).toThrow('no path along the contour from "A" to "A"');
  });

  it('nomme la pièce et le bord dans l’erreur', () => {
    try {
      resolveEdges('boîte', [edge('lost', 'A', 'nowhere')], CONTOUR, POINTS);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(EdgeNotFoundError);
      expect(error).toMatchObject({ code: 'edge-not-found', part: 'boîte', edge: 'lost' });
    }
  });

  it('contrôle les points via : un sommet attendu dans le bord mais situé ailleurs est refusé', () => {
    const attempt = (): unknown =>
      resolveEdges('boîte', [edge('top', 'A', 'C', ['E'])], CONTOUR, POINTS);
    expect(attempt).toThrow('point "E" is a vertex outside this edge');
  });

  it('ignore un point via qui n’est pas un sommet, ou qui n’existe pas', () => {
    const sheet = [edge('top', 'A', 'C', ['middle', 'ghost'])];
    expect(resolveEdges('boîte', sheet, CONTOUR, POINTS)[0]?.segments).toEqual([0, 1]);
  });

  it('choisit le plus court chemin quand le contour repasse par un même point (pince de largeur nulle)', () => {
    // Le point `apex` est aux sommets 2 et 5 : A(0,0) B(100,0) apex D(100,100) F(0,100) apex.
    const apex = p(50, 50);
    const points = { A: p(0, 0), B: p(100, 0), apex, D: p(100, 100), F: p(0, 100) };
    const contour = extractContour('pince', [
      { type: 'move', to: points.A },
      { type: 'line', to: points.B },
      { type: 'line', to: apex },
      { type: 'line', to: points.D },
      { type: 'line', to: points.F },
      { type: 'line', to: apex },
      { type: 'close' },
    ]);
    const edges = resolveEdges(
      'pince',
      [edge('in', 'B', 'apex'), edge('out', 'apex', 'A')],
      contour,
      points,
    );
    expect(edges[0]?.segments).toEqual([1]);
    expect(edges[1]?.fromVertex).toBe(5);
    expect(edges[1]?.segments).toEqual([5]);
  });
});

describe('assertCoverage', () => {
  const resolve = (sheet: EdgeSheet[]) => resolveEdges('boîte', sheet, CONTOUR, POINTS);

  it('accepte des bords qui couvrent le contour exactement une fois', () => {
    expect(() => assertCoverage('boîte', CONTOUR, resolve(SHEET))).not.toThrow();
  });

  it('refuse un segment sans bord et nomme ses indices', () => {
    const edges = resolve(SHEET.slice(0, 3));
    try {
      assertCoverage('boîte', CONTOUR, edges);
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CoverageError);
      expect(error).toMatchObject({
        code: 'coverage',
        part: 'boîte',
        uncovered: [5],
        overlapping: [],
      });
    }
  });

  it('refuse un segment couvert par deux bords', () => {
    const edges = resolve([...SHEET, edge('again', 'B', 'C')]);
    try {
      assertCoverage('boîte', CONTOUR, edges);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ uncovered: [], overlapping: [1] });
      expect((error as Error).message).toContain('several edges [1]');
    }
  });
});

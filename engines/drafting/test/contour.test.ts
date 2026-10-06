import { describe, expect, it } from 'vitest';
import { extractContour, isNear, SNAP_TOLERANCE_MM } from '../src/core/contour.js';
import { ContourError } from '../src/core/errors.js';
import type { PathOp, PointMm } from '../src/core/types.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });
const move = (xMm: number, yMm: number): PathOp => ({ type: 'move', to: p(xMm, yMm) });
const line = (xMm: number, yMm: number): PathOp => ({ type: 'line', to: p(xMm, yMm) });
const close: PathOp = { type: 'close' };

/** Rectangle de 300 × 200 mm fermé par `close`. */
const RECTANGLE: PathOp[] = [move(0, 0), line(300, 0), line(300, 200), line(0, 200), close];

describe('extractContour', () => {
  it('découpe un rectangle fermé par close en quatre segments', () => {
    const contour = extractContour('rectangle', RECTANGLE);
    expect(contour.vertices).toEqual([p(0, 0), p(300, 0), p(300, 200), p(0, 200)]);
    expect(contour.segments.map((s) => [s.kind, s.from, s.to, s.lengthMm])).toEqual([
      ['line', 0, 1, 300],
      ['line', 1, 2, 200],
      ['line', 2, 3, 300],
      ['line', 3, 0, 200],
    ]);
  });

  it('accepte un contour qui revient lui-même à son point de départ, avec ou sans close', () => {
    const explicit = [move(0, 0), line(300, 0), line(300, 200), line(0, 0)];
    expect(extractContour('triangle', explicit).segments).toHaveLength(3);
    expect(extractContour('triangle', [...explicit, close]).segments).toHaveLength(3);
  });

  it('mesure une courbe de Bézier cubique et garde ses points de contrôle', () => {
    const ops: PathOp[] = [
      move(0, 0),
      { type: 'curve', cp1: p(0, 50), cp2: p(50, 100), to: p(100, 100) },
      line(100, 0),
      close,
    ];
    const contour = extractContour('arc', ops);
    const [curve] = contour.segments;
    expect(curve?.kind).toBe('curve');
    expect(curve?.cp1).toEqual(p(0, 50));
    expect(curve?.cp2).toEqual(p(50, 100));
    expect(curve?.lengthMm).toBeGreaterThan(Math.sqrt(100 * 100 + 100 * 100));
    expect(curve?.lengthMm).toBeLessThan(200);
  });

  it('ignore un segment de longueur nulle (point répété)', () => {
    const ops: PathOp[] = [
      move(0, 0),
      line(100, 0),
      line(100, 0),
      line(100, 100),
      line(0, 100),
      close,
    ];
    const contour = extractContour('répété', ops);
    expect(contour.segments).toHaveLength(4);
    expect(contour.vertices).toHaveLength(4);
  });

  it('ne dessine rien après close', () => {
    const contour = extractContour('close', [...RECTANGLE, line(999, 999)]);
    expect(contour.segments).toHaveLength(4);
  });

  it('rend des segments qui s’enchaînent et se referment sur le sommet 0', () => {
    const contour = extractContour('rectangle', RECTANGLE);
    contour.segments.forEach((segment, index) => {
      const next = contour.segments[(index + 1) % contour.segments.length];
      expect(segment.to).toBe(next?.from);
    });
    expect(contour.segments.at(-1)?.to).toBe(0);
  });

  it.each([
    ['pas de chemin', undefined, 'no seam path'],
    ['contour non fermé', [move(0, 0), line(100, 0), line(100, 100)], 'not closed'],
    ['moins de deux segments', [move(0, 0), line(100, 0)], 'less than two segments'],
    ['sous-chemin', [move(0, 0), line(100, 0), move(500, 500), line(600, 500)], 'second sub-path'],
    ['tracé avant le premier move', [line(100, 0)], 'before the first move'],
    ['coordonnée non finie', [move(0, 0), line(Number.NaN, 0), close], 'non-finite'],
    [
      'point de contrôle infini',
      [move(0, 0), { type: 'curve', cp1: p(Infinity, 0), cp2: p(0, 0), to: p(5, 5) }, close],
      'non-finite',
    ],
  ] as const)('refuse : %s', (_name, ops, message) => {
    const attempt = (): unknown => extractContour('pièce', ops as readonly PathOp[] | undefined);
    expect(attempt).toThrow(ContourError);
    expect(attempt).toThrow(message);
  });

  it('accepte un second move posé sur le point courant (même sous-chemin)', () => {
    const ops = [move(0, 0), line(100, 0), move(100, 0), line(100, 100), line(0, 100), close];
    expect(extractContour('move répété', ops).segments).toHaveLength(4);
  });
});

describe('isNear', () => {
  it('confond deux points à 0,01 mm près sur chaque axe', () => {
    expect(SNAP_TOLERANCE_MM).toBe(0.01);
    expect(isNear(p(1, 1), p(1.009, 0.991))).toBe(true);
    expect(isNear(p(1, 1), p(1.011, 1))).toBe(false);
    expect(isNear(p(1, 1), p(1, 1.011))).toBe(false);
  });
});

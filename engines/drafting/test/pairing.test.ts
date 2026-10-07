import { describe, expect, it } from 'vitest';
import { cubicPointAt } from '../src/core/curve.js';
import { SeamError } from '../src/core/errors.js';
import { MERGE_FRACTION, pairWalks } from '../src/core/pairing.js';
import type { WalkEdge } from '../src/core/pairing.js';
import { curvePiece, linePiece, piecesLength } from '../src/core/pieces.js';
import type { Piece } from '../src/core/pieces.js';
import type { PointMm } from '../src/core/types.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

/** Droites bout à bout le long de l'axe x, de longueurs données, à partir de `start`. */
function lines(lengths: number[], start = 0, y = 0): Piece[] {
  let at = start;
  return lengths.map((length) => {
    const piece = linePiece(p(at, y), p(at + length, y));
    at += length;
    return piece;
  });
}

const edge = (pieces: Piece[], reversed = false): WalkEdge => ({ pieces, reversed });
const lengthsOf = (pieces: readonly Piece[]): number[] =>
  pieces.map((piece) => Math.round(piece.lengthMm * 1e6) / 1e6);

describe('pairWalks : appariement par fractions de longueur', () => {
  it('ne coupe rien quand les deux côtés ont les mêmes pièces', () => {
    const a = edge(lines([100]));
    const b = edge(lines([100], 0, 5));
    const result = pairWalks([a], [b], 'side');
    expect(result.pairs).toHaveLength(1);
    expect(result.a.edges[0]).toHaveLength(1);
    expect(lengthsOf(result.a.walked)).toEqual([100]);
  });

  it('coupe un côté là où l’autre change de pièce', () => {
    const result = pairWalks([edge(lines([100]))], [edge(lines([40, 60]))], 'seam');
    expect(lengthsOf(result.a.edges[0] as Piece[])).toEqual([40, 60]);
    expect(lengthsOf(result.b.edges[0] as Piece[])).toEqual([40, 60]);
    expect(result.pairs.map(([x, y]) => [x.lengthMm, y.lengthMm])).toEqual([
      [40, 40],
      [60, 60],
    ]);
  });

  it('répartit l’embu au prorata : a 10 % plus long que b donne des paires dans ce rapport', () => {
    const result = pairWalks([edge(lines([110]))], [edge(lines([40, 60]))], 'cap');
    const gaps = result.pairs.map(([x, y]) => [Math.round(x.lengthMm * 1e6) / 1e6, y.lengthMm]);
    expect(gaps).toEqual([
      [44, 40],
      [66, 60],
    ]);
  });

  it('découpe chaque côté aux changements de pièce de l’autre, dans l’ordre du parcours', () => {
    const result = pairWalks([edge(lines([30, 30, 40]))], [edge(lines([50, 50]))], 'seam');
    expect(lengthsOf(result.a.walked)).toEqual([30, 20, 10, 40]);
    expect(lengthsOf(result.b.walked)).toEqual([30, 20, 10, 40]);
  });

  it('suit un parcours de plusieurs bords : les pièces coupées reviennent bord par bord', () => {
    const front = edge(lines([60, 40]));
    const back = edge(lines([50, 50], 200), true);
    const cap = edge(lines([100, 100], 400));
    const result = pairWalks([cap], [front, back], 'armhole');
    expect(lengthsOf(result.a.edges[0] as Piece[])).toEqual([60, 40, 50, 50]);
    expect(lengthsOf(result.b.edges[0] as Piece[])).toEqual([60, 40]);
    expect(lengthsOf(result.b.edges[1] as Piece[])).toEqual([50, 50]);
    expect(result.pairs).toHaveLength(4);
  });

  it('parcourt un bord à l’envers : ses pièces coupées restent dans le sens du contour', () => {
    const forward = lines([30, 70]);
    const result = pairWalks([edge(lines([100]))], [edge(forward, true)], 'underarm');
    // Parcouru à l’envers, b commence par sa pièce de 70 : a est coupé à 70.
    expect(lengthsOf(result.a.walked)).toEqual([70, 30]);
    expect(lengthsOf(result.b.edges[0] as Piece[])).toEqual([30, 70]);
    const [first] = result.pairs;
    expect((first as readonly Piece[])[1]?.lengthMm).toBe(70);
    // La pièce de b reste orientée comme son contour (de gauche à droite), non comme le parcours.
    expect((result.b.edges[0] as Piece[])[0]?.p0).toEqual(p(0, 0));
  });

  it('rend, pour une pièce coupée à l’envers, des morceaux qui se raccordent dans le sens du contour', () => {
    const arc = curvePiece({ p0: p(0, 0), c1: p(0, 50), c2: p(60, 50), p3: p(60, 0) });
    const result = pairWalks(
      [edge(lines([arc.lengthMm / 2, arc.lengthMm / 2]))],
      [edge([arc], true)],
      'cap',
    );
    const [first, second] = result.b.edges[0] as Piece[];
    expect(first?.p0).toEqual(arc.p0);
    expect(first?.p1).toEqual(second?.p0);
    expect(second?.p1).toEqual(arc.p1);
  });

  it('garde la forme des courbes coupées : les morceaux sont sur la courbe d’origine', () => {
    const arc = { p0: p(0, 0), c1: p(0, 50), c2: p(60, 50), p3: p(60, 0) };
    const whole = curvePiece(arc);
    const result = pairWalks(
      [edge([whole])],
      [edge(lines([whole.lengthMm * 0.3, whole.lengthMm * 0.7]))],
      'cap',
    );
    const [head, tail] = result.a.edges[0] as Piece[];
    expect(head?.kind).toBe('curve');
    expect(head?.p0).toEqual(arc.p0);
    expect(tail?.p1).toEqual(arc.p3);
    expect(head?.p1).toEqual(tail?.p0);
    const cut = head?.p1 as PointMm;
    // Le point de coupe est sur la courbe d’origine : on le cherche par échantillonnage fin.
    let nearest = Infinity;
    for (let i = 0; i <= 2000; i++) {
      const q = cubicPointAt(arc, i / 2000);
      nearest = Math.min(nearest, Math.sqrt((q.xMm - cut.xMm) ** 2 + (q.yMm - cut.yMm) ** 2));
    }
    expect(nearest).toBeLessThan(0.05);
    expect(head?.lengthMm).toBeCloseTo(whole.lengthMm * 0.3, 8);
    expect(piecesLength([head as Piece, tail as Piece])).toBeCloseTo(whole.lengthMm, 8);
  });

  it('confond deux points de découpe très proches : pas de pièce minuscule, un écart d’au plus ce rapprochement', () => {
    const result = pairWalks([edge(lines([40, 60]))], [edge(lines([40.01, 59.99]))], 'seam');
    expect(result.pairs).toHaveLength(2);
    expect(lengthsOf(result.a.walked)).toEqual([40, 60]);
    expect(Math.abs(40 - 40.01)).toBeLessThan(MERGE_FRACTION * 100);
  });

  it('coupe en revanche deux points de découpe plus éloignés que le rapprochement toléré', () => {
    const result = pairWalks([edge(lines([40, 60]))], [edge(lines([41, 59]))], 'seam');
    expect(result.pairs).toHaveLength(3);
    expect(lengthsOf(result.a.walked)).toEqual([40, 1, 59]);
  });

  it('garde une pièce minuscule sur les deux côtés au lieu de désaccorder le nombre de pièces (FreeSewing en trace à des options extrêmes)', () => {
    // Un éclat de 0,05 mm au début de b, un autre à la fin de a : plus courts que le rapprochement toléré.
    const a = edge(lines([100, 0.05]));
    const b = edge(lines([0.05, 100]));
    const result = pairWalks([a], [b], 'sliver');
    expect(result.a.walked.length).toBe(result.b.walked.length);
    expect(result.pairs.length).toBeGreaterThanOrEqual(3);
    const total = (pieces: readonly Piece[]): number =>
      pieces.reduce((sum, piece) => sum + piece.lengthMm, 0);
    expect(total(result.a.walked)).toBeCloseTo(100.05, 9);
    expect(total(result.b.walked)).toBeCloseTo(100.05, 9);
    for (const piece of [...result.a.walked, ...result.b.walked])
      expect(piece.lengthMm).toBeGreaterThan(0);
  });

  it('ne confond jamais deux limites de pièces d’un même parcours, même plus proches que le rapprochement toléré', () => {
    const result = pairWalks([edge(lines([50, 0.01, 49.99]))], [edge(lines([100]))], 'tight');
    expect(lengthsOf(result.a.walked)).toEqual([50, 0.01, 49.99]);
    expect(result.pairs).toHaveLength(3);
  });

  it('refuse un côté sans longueur, par une erreur typée qui nomme la couture', () => {
    const attempt = (): unknown => pairWalks([edge([])], [edge(lines([10]))], 'ghost');
    expect(attempt).toThrow(SeamError);
    expect(attempt).toThrow('seam ghost: a side of the seam has no length');
  });
});

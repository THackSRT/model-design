import { describe, expect, it } from 'vitest';
import {
  cubicLengthMm,
  cubicPointAt,
  lerp,
  parameterAtLength,
  splitCubic,
} from '../src/core/curve.js';
import type { Cubic } from '../src/core/curve.js';
import {
  curvePiece,
  flipPiece,
  linePiece,
  mergeCollinear,
  pieceOfSegment,
  piecesLength,
  reversePiece,
  signedArea,
  splitPiece,
} from '../src/core/pieces.js';
import type { CurvePiece, Piece } from '../src/core/pieces.js';
import type { PointMm, Segment } from '../src/core/types.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

/** Un arc asymétrique, comme une emmanchure : la vitesse du paramètre varie beaucoup. */
const ARC: Cubic = { p0: p(0, 0), c1: p(10, 80), c2: p(70, 120), p3: p(100, 20) };

const distance = (a: PointMm, b: PointMm): number =>
  Math.sqrt((a.xMm - b.xMm) ** 2 + (a.yMm - b.yMm) ** 2);

describe('découpe d’une courbe de Bézier (de Casteljau)', () => {
  it('rend deux courbes qui se raccordent et dont les extrémités sont celles de la courbe', () => {
    const [head, tail] = splitCubic(ARC, 0.3);
    expect(head.p0).toEqual(ARC.p0);
    expect(tail.p3).toEqual(ARC.p3);
    expect(head.p3).toEqual(tail.p0);
    expect(distance(head.p3, cubicPointAt(ARC, 0.3))).toBeLessThan(1e-12);
  });

  it('garde la forme : chaque moitié reparamètre la courbe d’origine', () => {
    const t = 0.37;
    const [head, tail] = splitCubic(ARC, t);
    for (let k = 0; k <= 10; k++) {
      const s = k / 10;
      expect(distance(cubicPointAt(head, s), cubicPointAt(ARC, s * t))).toBeLessThan(1e-9);
      expect(distance(cubicPointAt(tail, s), cubicPointAt(ARC, t + s * (1 - t)))).toBeLessThan(
        1e-9,
      );
    }
  });

  it('trouve le paramètre où l’arc mesure une longueur donnée', () => {
    const total = cubicLengthMm(ARC.p0, ARC.c1, ARC.c2, ARC.p3);
    for (const share of [0.05, 0.25, 0.5, 0.8, 0.99]) {
      const t = parameterAtLength(ARC, share * total);
      const [head] = splitCubic(ARC, t);
      expect(cubicLengthMm(head.p0, head.c1, head.c2, head.p3)).toBeCloseTo(share * total, 9);
    }
    expect(parameterAtLength(ARC, 0)).toBeCloseTo(0, 12);
    expect(parameterAtLength(ARC, total)).toBeCloseTo(1, 9);
  });
});

describe('pièces d’un bord de patron', () => {
  const curve = curvePiece(ARC);
  const line = linePiece(p(0, 0), p(30, 40));

  it('mesurent la droite et la courbe', () => {
    expect(line.lengthMm).toBe(50);
    expect(curve.lengthMm).toBeCloseTo(cubicLengthMm(ARC.p0, ARC.c1, ARC.c2, ARC.p3), 12);
    expect(piecesLength([line, curve])).toBeCloseTo(50 + curve.lengthMm, 12);
  });

  it('se coupent en deux pièces qui se raccordent, dont la première a la longueur demandée', () => {
    for (const piece of [line, curve]) {
      for (const share of [0.1, 0.5, 0.93]) {
        const [head, tail] = splitPiece(piece, share * piece.lengthMm);
        expect(head.lengthMm).toBeCloseTo(share * piece.lengthMm, 8);
        expect(head.lengthMm + tail.lengthMm).toBeCloseTo(piece.lengthMm, 8);
        expect(head.p0).toEqual(piece.p0);
        expect(tail.p1).toEqual(piece.p1);
        expect(head.p1).toEqual(tail.p0);
      }
    }
  });

  it('gardent le type : une droite donne deux droites, une courbe deux courbes', () => {
    expect(splitPiece(line, 20).map((piece) => piece.kind)).toEqual(['line', 'line']);
    expect(splitPiece(curve, 20).map((piece) => piece.kind)).toEqual(['curve', 'curve']);
    expect(splitPiece(line, 20)[0].p1).toEqual(p(12, 16));
  });

  it('se parcourent à l’envers sans changer de longueur, et deux fois redonnent la pièce', () => {
    for (const piece of [line, curve]) {
      const reversed = reversePiece(piece);
      expect(reversed.lengthMm).toBe(piece.lengthMm);
      expect(reversed.p0).toEqual(piece.p1);
      expect(reversed.p1).toEqual(piece.p0);
      expect(reversePiece(reversed)).toEqual(piece);
    }
    const back = reversePiece(curve) as CurvePiece;
    expect([back.c1, back.c2]).toEqual([ARC.c2, ARC.c1]);
  });

  it('se retournent en y (repère de GarmentSpec) sans changer de longueur', () => {
    const flipped = flipPiece(curve) as CurvePiece;
    expect(flipped.p0).toEqual(p(0, -0));
    expect(flipped.c1).toEqual(p(10, -80));
    expect(flipped.p1).toEqual(p(100, -20));
    expect(flipped.lengthMm).toBe(curve.lengthMm);
  });

  it('se tirent d’un segment du contour ; une courbe sans points de contrôle est refusée', () => {
    const vertices = [p(0, 0), p(30, 40)];
    const segment: Segment = { kind: 'line', from: 0, to: 1, lengthMm: 50 };
    expect(pieceOfSegment(segment, vertices)).toEqual(line);
    const arc: Segment = { kind: 'curve', from: 0, to: 1, lengthMm: 1, cp1: p(1, 1), cp2: p(2, 2) };
    expect(pieceOfSegment(arc, vertices)?.kind).toBe('curve');
    expect(pieceOfSegment({ ...arc, cp2: undefined }, vertices)).toBeUndefined();
  });
});

describe('aire signée', () => {
  const square = (first: PointMm, ...others: PointMm[]): Piece[] =>
    [first, ...others].map((point, i, all) =>
      linePiece(point, all[(i + 1) % all.length] as PointMm),
    );

  it('est positive pour un contour trigonométrique (y vers le haut), négative sinon', () => {
    const counter = square(p(0, 0), p(10, 0), p(10, 10), p(0, 10));
    expect(signedArea(counter)).toBe(100);
    expect(signedArea([...counter].reverse().map(reversePiece))).toBe(-100);
  });

  it('suit les courbes : une demi-lune bombée vers le haut ajoute de l’aire', () => {
    const arch = curvePiece({ p0: p(10, 10), c1: p(10, 30), c2: p(0, 30), p3: p(0, 10) });
    const flat = linePiece(p(0, 10), p(0, 0));
    const pieces = [linePiece(p(0, 0), p(10, 0)), linePiece(p(10, 0), p(10, 10)), arch, flat];
    expect(signedArea(pieces)).toBeGreaterThan(100 + 10);
  });

  it('ne dépend pas du point de départ du contour', () => {
    const base = square(p(0, 0), p(10, 0), p(10, 10), p(0, 10));
    const rotated = [...base.slice(2), ...base.slice(0, 2)];
    expect(signedArea(rotated)).toBe(signedArea(base));
    expect(lerp(p(0, 0), p(10, 10), 0.5)).toEqual(p(5, 5));
  });
});

describe('mergeCollinear : droites consécutives d’une même droite', () => {
  it('fond les droites qui se prolongent, de la première extrémité à la dernière', () => {
    const merged = mergeCollinear([
      linePiece(p(0, 0), p(0, 100)),
      linePiece(p(0, 100), p(0, 130)),
      linePiece(p(0, 130), p(0, 200)),
    ]);
    expect(merged).toEqual([linePiece(p(0, 0), p(0, 200))]);
  });

  it('fond aussi un aller-retour sur la même droite : le dos de Brian descend aux hanches puis remonte à l’ourlet', () => {
    const merged = mergeCollinear([linePiece(p(0, 0), p(0, 600)), linePiece(p(0, 600), p(0, 575))]);
    expect(merged).toEqual([linePiece(p(0, 0), p(0, 575))]);
  });

  it('garde deux droites qui forment un angle, et ne touche pas aux courbes', () => {
    const corner = [linePiece(p(0, 0), p(10, 0)), linePiece(p(10, 0), p(10, 10))];
    expect(mergeCollinear(corner)).toEqual(corner);
    const arc = curvePiece(ARC);
    const mixed = [linePiece(p(-10, 0), p(0, 0)), arc, linePiece(p(100, 20), p(110, 20))];
    expect(mergeCollinear(mixed)).toEqual(mixed);
  });

  it('ne fond pas deux droites presque parallèles dont l’angle dépasse 1e-6 rad', () => {
    const almost = [linePiece(p(0, 0), p(300, 0)), linePiece(p(300, 0), p(600, 0.01))];
    expect(mergeCollinear(almost)).toHaveLength(2);
  });

  it('rend une liste vide ou une seule pièce telle quelle', () => {
    expect(mergeCollinear([])).toEqual([]);
    const only = [linePiece(p(0, 0), p(5, 5))];
    expect(mergeCollinear(only)).toEqual(only);
  });
});

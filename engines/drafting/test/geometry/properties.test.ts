import { describe, expect, it } from 'vitest';
import {
  boundingBox,
  dedupePoints,
  distanceMm,
  insetPolygonMiter,
  isPointInPolygon,
  mirrorPoints,
  nearestPointOnPolyline,
  offsetPolyline,
  outsetPolygonPerEdge,
  point,
  pointAt,
  polygonCrossings,
  polylineLengthMm,
  resamplePolyline,
  signedAreaMm2,
  slicePolyline,
  smoothCatmullRom,
  splitPolygon,
} from '../../src/geometry.js';
import type { PointMm } from '../../src/geometry.js';
import {
  between,
  centroid,
  convexPolygon,
  integerBetween,
  mulberry32,
  perimeterMm,
  randomPolyline,
} from './support.js';

/** Droite, ou ligne brisée au point intérieur, qui traverse un polygone convexe de part en part. */
function crossingLine(random: () => number, polygon: readonly PointMm[]): PointMm[] {
  const middle = centroid(polygon);
  const far = (angle: number): PointMm =>
    point(middle.xMm + 5000 * Math.cos(angle), middle.yMm + 5000 * Math.sin(angle));
  const angle = random() * 2 * Math.PI;
  if (random() < 0.5) return [far(angle), far(angle + Math.PI)];
  return [far(angle), middle, far(random() * 2 * Math.PI)];
}

/** Un croisement trop près d'un sommet ferait retirer des points confondus (0,05 mm) et fausserait les aires. */
const nearAVertex = (polygon: readonly PointMm[], p: PointMm): boolean =>
  polygon.some((vertex) => distanceMm(vertex, p) < 0.2);

describe('propriétés : découpe d’un polygone convexe par une ligne qui le traverse', () => {
  it('donne deux polygones dont la somme des aires vaut l’aire initiale (1e-6 près)', () => {
    const random = mulberry32(157);
    let checked = 0;
    for (let i = 0; i < 400; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 3, 10));
      const cut = crossingLine(random, polygon);
      const crossings = polygonCrossings(polygon, cut);
      if (crossings.length !== 2 || crossings.some((hit) => nearAVertex(polygon, hit.point))) {
        continue;
      }
      checked++;
      const { a, b, seam } = splitPolygon(polygon, cut);
      const whole = signedAreaMm2(polygon);
      expect(a.length).toBeGreaterThanOrEqual(3);
      expect(b.length).toBeGreaterThanOrEqual(3);
      expect(Math.abs(signedAreaMm2(a)) + Math.abs(signedAreaMm2(b))).toBeCloseTo(
        Math.abs(whole),
        6,
      );
      expect(signedAreaMm2(a) + signedAreaMm2(b)).toBeCloseTo(whole, 6);
      // Chaque morceau garde le sens du polygone.
      expect(Math.sign(signedAreaMm2(a))).toBe(Math.sign(whole));
      expect(Math.sign(signedAreaMm2(b))).toBe(Math.sign(whole));
      // Le contour des deux morceaux est celui du polygone, plus la couture parcourue deux fois.
      expect(perimeterMm(a) + perimeterMm(b)).toBeCloseTo(
        perimeterMm(polygon) + 2 * polylineLengthMm(seam),
        6,
      );
      expect(seam[0]).toEqual(crossings[0]?.point);
      expect(seam[seam.length - 1]).toEqual(crossings[1]?.point);
    }
    expect(checked).toBeGreaterThan(380);
  });

  it('place tous les sommets des morceaux dans le polygone ou sur son contour', () => {
    const random = mulberry32(2026);
    for (let i = 0; i < 150; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 3, 10));
      const cut = crossingLine(random, polygon);
      if (polygonCrossings(polygon, cut).some((hit) => nearAVertex(polygon, hit.point))) continue;
      const { a, b } = splitPolygon(polygon, cut);
      for (const vertex of [...a, ...b]) {
        const onOutline = nearestPointOnPolyline(polygon, vertex, true).distanceMm < 1e-6;
        expect(onOutline || isPointInPolygon(vertex, polygon)).toBe(true);
      }
    }
  });
});

describe('propriétés : abscisse curviligne', () => {
  it('pointAt(longueur) donne le dernier point, pointAt(0) le premier, et chaque sommet à son abscisse', () => {
    const random = mulberry32(11);
    for (let i = 0; i < 300; i++) {
      const line = randomPolyline(random, integerBetween(random, 1, 30));
      expect(pointAt(line, polylineLengthMm(line))).toEqual(line[line.length - 1]);
      expect(pointAt(line, 0)).toEqual(line[0]);
      let walked = 0;
      line.forEach((vertex, index) => {
        if (index > 0) walked += distanceMm(line[index - 1] as PointMm, vertex);
        expect(pointAt(line, walked)).toEqual(vertex);
      });
    }
  });

  it('prend un point de la polyligne à toute abscisse, et le retrouve par le point le plus proche', () => {
    const random = mulberry32(12);
    for (let i = 0; i < 200; i++) {
      const line = randomPolyline(random, integerBetween(random, 2, 20));
      const length = polylineLengthMm(line);
      const found = pointAt(line, between(random, -10, length + 10));
      const nearest = nearestPointOnPolyline(line, found);
      expect(nearest.distanceMm).toBeLessThan(1e-9);
      expect(distanceMm(pointAt(line, nearest.lengthMm), nearest.point)).toBeLessThan(1e-6);
    }
  });

  it('découpe une portion dont la longueur est l’écart des abscisses', () => {
    const random = mulberry32(13);
    for (let i = 0; i < 300; i++) {
      const line = randomPolyline(random, integerBetween(random, 2, 20));
      const length = polylineLengthMm(line);
      const from = between(random, 0, length);
      const to = between(random, from, length);
      const portion = slicePolyline(line, from, to);
      expect(polylineLengthMm(portion)).toBeCloseTo(to - from, 7);
      expect(portion[0]).toEqual(pointAt(line, from));
      expect(portion[portion.length - 1]).toEqual(pointAt(line, to));
    }
  });

  it('rééchantillonne en points de la polyligne, équidistants en abscisse, extrémités comprises', () => {
    const random = mulberry32(14);
    for (let i = 0; i < 200; i++) {
      const line = randomPolyline(random, integerBetween(random, 2, 15));
      const length = polylineLengthMm(line);
      const step = between(random, 5, 60);
      const samples = resamplePolyline(line, step);
      const count = Math.max(1, Math.round(length / step));
      expect(samples).toHaveLength(count + 1);
      expect(samples[0]).toEqual(line[0]);
      expect(samples[count]).toEqual(line[line.length - 1]);
      for (const sample of samples) {
        expect(nearestPointOnPolyline(line, sample).distanceMm).toBeLessThan(1e-9);
      }
      for (let k = 0; k < count; k++) {
        const between2 = slicePolyline(line, (length * k) / count, (length * (k + 1)) / count);
        expect(polylineLengthMm(between2)).toBeCloseTo(length / count, 7);
      }
    }
  });

  it('trouve un point plus proche que tous ceux d’un échantillonnage fin', () => {
    const random = mulberry32(15);
    for (let i = 0; i < 100; i++) {
      const line = randomPolyline(random, integerBetween(random, 2, 10));
      const target = point(between(random, -600, 600), between(random, -900, 900));
      const nearest = nearestPointOnPolyline(line, target);
      expect(distanceMm(nearest.point, target)).toBeCloseTo(nearest.distanceMm, 9);
      for (const sample of resamplePolyline(line, 2)) {
        expect(distanceMm(sample, target)).toBeGreaterThanOrEqual(nearest.distanceMm - 1e-9);
      }
    }
  });
});

describe('propriétés : points, courbes et décalages', () => {
  it('lisse en passant par chaque point donné, à chaque multiple du nombre de segments', () => {
    const random = mulberry32(21);
    for (let i = 0; i < 100; i++) {
      const line = randomPolyline(random, integerBetween(random, 3, 12));
      const segments = integerBetween(random, 1, 8);
      const smoothed = smoothCatmullRom(line, segments);
      expect(smoothed).toHaveLength((line.length - 1) * segments + 1);
      line.forEach((vertex, index) => expect(smoothed[index * segments]).toEqual(vertex));
    }
  });

  it('met en miroir deux fois pour retrouver les points, et change le signe de l’aire', () => {
    const random = mulberry32(22);
    for (let i = 0; i < 100; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 3, 10));
      const axis = between(random, -300, 300);
      const twice = mirrorPoints(mirrorPoints(polygon, axis), axis);
      twice.forEach((p, k) => expect(distanceMm(p, polygon[k] as PointMm)).toBeLessThan(1e-9));
      expect(signedAreaMm2(mirrorPoints(polygon, axis))).toBeCloseTo(-signedAreaMm2(polygon), 6);
    }
  });

  it('décale chaque point de la distance demandée, ou pas du tout quand ses voisins sont confondus', () => {
    const random = mulberry32(23);
    for (let i = 0; i < 200; i++) {
      const line = randomPolyline(random, integerBetween(random, 2, 20));
      const offset = between(random, -30, 30);
      offsetPolyline(line, offset).forEach((p, k) => {
        const moved = distanceMm(p, line[k] as PointMm);
        expect(moved === 0 || Math.abs(moved - Math.abs(offset)) < 1e-9).toBe(true);
      });
      offsetPolyline(line, 0).forEach((p, k) => {
        expect(distanceMm(p, line[k] as PointMm)).toBeLessThan(1e-12);
      });
    }
  });

  it('retire les points confondus sans rien changer ensuite (idempotent), et englobe tous les points', () => {
    const random = mulberry32(24);
    for (let i = 0; i < 200; i++) {
      const line = randomPolyline(random, integerBetween(random, 1, 30));
      const closed = random() < 0.5;
      const once = dedupePoints(line, closed);
      expect(dedupePoints(once, closed)).toEqual(once);
      const box = boundingBox(line);
      for (const p of line) {
        expect(p.xMm).toBeGreaterThanOrEqual(box.minXMm);
        expect(p.xMm).toBeLessThanOrEqual(box.maxXMm);
        expect(p.yMm).toBeGreaterThanOrEqual(box.minYMm);
        expect(p.yMm).toBeLessThanOrEqual(box.maxYMm);
      }
    }
  });

  it('juge de l’appartenance à un polygone convexe comme le ferait un test de demi-plans', () => {
    const random = mulberry32(25);
    for (let i = 0; i < 100; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 3, 10));
      const sign = Math.sign(signedAreaMm2(polygon));
      for (let k = 0; k < 20; k++) {
        const p = point(between(random, -700, 700), between(random, -700, 700));
        const sides = polygon.map((a, index) => {
          const b = polygon[(index + 1) % polygon.length] as PointMm;
          const cross = (b.xMm - a.xMm) * (p.yMm - a.yMm) - (b.yMm - a.yMm) * (p.xMm - a.xMm);
          return { cross: cross * sign, edge: distanceMm(a, b) };
        });
        // Un point à moins de 1e-6 mm d'un côté est trop près pour trancher.
        if (sides.some(({ cross, edge }) => Math.abs(cross / edge) < 1e-6)) continue;
        expect(isPointInPolygon(p, polygon)).toBe(sides.every(({ cross }) => cross > 0));
      }
    }
  });
});

describe('propriétés : décalage d’un polygone convexe aux angles ouverts', () => {
  /** Distance de `p` à la droite qui porte le côté de `a` à `b`. */
  const toLine = (p: PointMm, a: PointMm, b: PointMm): number =>
    Math.abs((b.xMm - a.xMm) * (p.yMm - a.yMm) - (b.yMm - a.yMm) * (p.xMm - a.xMm)) /
    distanceMm(a, b);

  it('met chaque côté à la distance demandée, vers l’intérieur ou vers l’extérieur', () => {
    const random = mulberry32(31);
    for (let i = 0; i < 150; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 6, 10), 1.5, 0.25);
      const distance = between(random, 2, 20);
      for (const signed of [distance, -distance]) {
        const moved = insetPolygonMiter(polygon, signed);
        moved.forEach((p, k) => {
          const next = moved[(k + 1) % moved.length] as PointMm;
          const from = polygon[k] as PointMm;
          const to = polygon[(k + 1) % polygon.length] as PointMm;
          expect(toLine(p, from, to)).toBeCloseTo(distance, 6);
          expect(toLine(next, from, to)).toBeCloseTo(distance, 6);
        });
        const area = Math.abs(signedAreaMm2(moved));
        expect(
          signed > 0
            ? area < Math.abs(signedAreaMm2(polygon))
            : area > Math.abs(signedAreaMm2(polygon)),
        ).toBe(true);
      }
    }
  });

  it('donne les mêmes sommets par insetPolygonMiter (distance négative) et par outsetPolygonPerEdge', () => {
    const random = mulberry32(32);
    for (let i = 0; i < 150; i++) {
      const polygon = convexPolygon(random, integerBetween(random, 6, 10), 1.5, 0.25);
      const allowance = between(random, 2, 20);
      const outset = outsetPolygonPerEdge(
        polygon,
        polygon.map(() => allowance),
      );
      const miter = insetPolygonMiter(polygon, -allowance);
      expect(outset).toHaveLength(polygon.length);
      outset.forEach((p, k) => expect(distanceMm(p, miter[k] as PointMm)).toBeLessThan(1e-7));
      for (const vertex of polygon) expect(isPointInPolygon(vertex, outset)).toBe(true);
    }
  });
});

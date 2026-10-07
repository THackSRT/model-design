import { expect } from 'vitest';
import { GeometryError, point, polylineLengthMm } from '../../src/geometry.js';
import type { GeometryErrorCode, PointMm } from '../../src/geometry.js';

/** Paire de coordonnées en millimètres, pour écrire les cas à la main. */
export type XY = readonly [number, number];

/** Points à partir de paires `[x, y]`. */
export const pts = (...pairs: readonly XY[]): PointMm[] => pairs.map(([x, y]) => point(x, y));

/** Rectangle de 100 × 50 mm, parcouru dans le sens horaire à l'écran (y vers le bas) : aire positive. */
export const RECT: readonly PointMm[] = pts([0, 0], [100, 0], [100, 50], [0, 50]);

/** Générateur pseudo-aléatoire reproductible (mulberry32) : les propriétés rejouent les mêmes cas. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fige un objet et tout ce qu'il contient : une fonction qui le modifierait lèverait une exception. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

/** Le point est en `(x, y)`, à `10^-digits / 2` près. */
export function expectPoint(actual: PointMm | undefined, x: number, y: number, digits = 9): void {
  expect(actual, `point attendu en (${x}, ${y})`).toBeDefined();
  expect(actual?.xMm).toBeCloseTo(x, digits);
  expect(actual?.yMm).toBeCloseTo(y, digits);
}

/** Les points sont, dans l'ordre, ceux des paires `[x, y]`. */
export function expectPoints(
  actual: readonly PointMm[],
  expected: readonly XY[],
  digits = 9,
): void {
  expect(actual).toHaveLength(expected.length);
  expected.forEach(([x, y], index) => expectPoint(actual[index], x, y, digits));
}

/** L'appel lève une `GeometryError` de ce code. */
export function expectGeometryError(run: () => unknown, code: GeometryErrorCode): void {
  let caught: unknown;
  try {
    run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(GeometryError);
  expect((caught as GeometryError).code).toBe(code);
}

/** Longueur du contour d'un polygone, côté de fermeture compris. */
export function perimeterMm(polygon: readonly PointMm[]): number {
  const first = polygon[0];
  return first === undefined ? 0 : polylineLengthMm([...polygon, first]);
}

/** Nombre réel tiré dans `[low, high[`. */
export const between = (random: () => number, low: number, high: number): number =>
  low + random() * (high - low);

/** Entier tiré dans `[low, high]`. */
export const integerBetween = (random: () => number, low: number, high: number): number =>
  low + Math.floor(random() * (high - low + 1));

/**
 * Polygone convexe de `count` (au plus 10) sommets sur une ellipse (rayons de 80 à 80 × `squash` mm), un sommet par
 * tranche d'angle, décalé de `jitter` tranche au plus ; parcouru au hasard dans un sens ou dans l'autre. Les sommets
 * sont à plus de 20 mm les uns des autres ; avec `squash` et `jitter` petits, les angles sont tous ouverts.
 */
export function convexPolygon(
  random: () => number,
  count: number,
  squash = 4,
  jitter = 0.6,
): PointMm[] {
  const centerX = between(random, -200, 200);
  const centerY = between(random, -200, 200);
  const radiusX = between(random, 80, 80 * squash);
  const radiusY = between(random, 80, 80 * squash);
  const slice = (2 * Math.PI) / count;
  const polygon = Array.from({ length: count }, (_, i) => {
    const angle = (i + random() * jitter) * slice;
    return point(centerX + radiusX * Math.cos(angle), centerY + radiusY * Math.sin(angle));
  });
  return random() < 0.5 ? polygon : polygon.reverse();
}

/** Moyenne des points : un point intérieur d'un polygone convexe. */
export function centroid(points: readonly PointMm[]): PointMm {
  const sum = points.reduce((total, p) => ({ x: total.x + p.xMm, y: total.y + p.yMm }), {
    x: 0,
    y: 0,
  });
  return point(sum.x / points.length, sum.y / points.length);
}

/** Polyligne à marche aléatoire, avec des points répétés ou alignés (cas limites des longueurs et des abscisses). */
export function randomPolyline(random: () => number, count: number): PointMm[] {
  const line: PointMm[] = [point(between(random, -500, 500), between(random, -800, 800))];
  while (line.length < count) {
    const previous = line[line.length - 1] as PointMm;
    const roll = random();
    if (roll < 0.12) line.push(previous);
    else
      line.push(
        point(previous.xMm + between(random, -150, 150), previous.yMm + between(random, -150, 150)),
      );
  }
  return line;
}

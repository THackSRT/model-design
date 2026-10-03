import type { Edge, Panel, Point } from '@atelier/contracts-ts';
import { InvalidInputError } from '../core/validate.js';
import {
  MAX_COORDINATE_MM,
  MAX_EDGES_PER_GARMENT,
  MAX_VERTICES_PER_GARMENT,
  assertVertexBudget,
  assertWithinDrapeLimits,
} from './limits.js';

// Contour d'une pièce : bords rééchantillonnés au pas h. Fonctions pures, millimètres.

/** Longueur maximale d'une arête de contour, en multiples de h. */
export const MAX_EDGE_RATIO = 1.2;
/** Flèche tolérée d'un bord courbe aplati, en multiples de h (h/20). */
export const FLATNESS_RATIO = 1 / 20;
/** Écart toléré entre la fin d'un bord et le début du suivant, en mm. */
const GAP_MM = 1e-3;

interface Curve {
  /** Points denses, 2 valeurs chacun. */
  dense: Float64Array;
  /** Abscisse curviligne cumulée de chaque point dense. */
  cum: Float64Array;
}

function lerp(a: Point, b: Point, t: number): Point {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** Point d'une courbe de Bézier (De Casteljau : quadratique ou cubique), t dans [0, 1]. */
export function bezierPoint(pts: readonly Point[], t: number): Point {
  let cur = pts;
  while (cur.length > 1) {
    const next: Point[] = [];
    for (let i = 0; i + 1 < cur.length; i++)
      next.push(lerp(cur[i] as Point, cur[i + 1] as Point, t));
    cur = next;
  }
  return cur[0] as Point;
}

function controlPolygonLength(pts: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i] as Point;
    const b = pts[i + 1] as Point;
    s += Math.sqrt((b[0] - a[0]) * (b[0] - a[0]) + (b[1] - a[1]) * (b[1] - a[1]));
  }
  return s;
}

function denseCurve(edge: Edge, edgeMm: number): Curve {
  const pts: Point[] = [edge.from, ...(edge.controls ?? []), edge.to];
  const segments =
    pts.length === 2
      ? 1
      : Math.min(1024, Math.max(16, Math.ceil(controlPolygonLength(pts) / (edgeMm / 10))));
  const dense = new Float64Array(2 * (segments + 1));
  for (let i = 0; i <= segments; i++) {
    const p = i === segments ? edge.to : bezierPoint(pts, i / segments);
    dense[2 * i] = p[0];
    dense[2 * i + 1] = p[1];
  }
  const cum = new Float64Array(segments + 1);
  for (let i = 1; i <= segments; i++) {
    const dx = (dense[2 * i] as number) - (dense[2 * i - 2] as number);
    const dy = (dense[2 * i + 1] as number) - (dense[2 * i - 1] as number);
    cum[i] = (cum[i - 1] as number) + Math.sqrt(dx * dx + dy * dy);
  }
  return { dense, cum };
}

/** n + 1 points (début et fin compris) à abscisses curvilignes égales sur la courbe dense. */
function resample(c: Curve, n: number): Float64Array {
  const total = c.cum[c.cum.length - 1] as number;
  const out = new Float64Array(2 * (n + 1));
  const d = c.dense;
  let i = 0;
  for (let k = 0; k <= n; k++) {
    const s = (total * k) / n;
    while (i + 2 < c.cum.length && (c.cum[i + 1] as number) < s) i++;
    const s0 = c.cum[i] as number;
    const len = (c.cum[i + 1] as number) - s0;
    const t = len > 0 ? Math.min(1, Math.max(0, (s - s0) / len)) : 0;
    out[2 * k] = (d[2 * i] as number) + ((d[2 * i + 2] as number) - (d[2 * i] as number)) * t;
    out[2 * k + 1] =
      (d[2 * i + 1] as number) + ((d[2 * i + 3] as number) - (d[2 * i + 1] as number)) * t;
  }
  return out;
}

/** Flèche maximale entre la courbe dense et la ligne brisée d'échantillons (n + 1 points). */
function maxSag(c: Curve, samples: Float64Array, n: number): number {
  const total = c.cum[c.cum.length - 1] as number;
  let worst = 0;
  for (let i = 0; i < c.cum.length; i++) {
    const k = Math.min(n - 1, Math.floor(((c.cum[i] as number) / total) * n));
    const ax = samples[2 * k] as number;
    const ay = samples[2 * k + 1] as number;
    const ex = (samples[2 * k + 2] as number) - ax;
    const ey = (samples[2 * k + 3] as number) - ay;
    const px = (c.dense[2 * i] as number) - ax;
    const py = (c.dense[2 * i + 1] as number) - ay;
    const el = Math.sqrt(ex * ex + ey * ey);
    worst = Math.max(worst, Math.abs(ex * py - ey * px) / el);
  }
  return worst;
}

/** Nombre de segments d'un bord de longueur `length` : proche de h, jamais au-delà de 1,2 h. */
export function segmentCount(length: number, edgeMm: number): number {
  const n = Math.max(1, Math.round(length / edgeMm));
  return length / n > MAX_EDGE_RATIO * edgeMm ? n + 1 : n;
}

function planEdge(edge: Edge, edgeMm: number): { curve: Curve; length: number } {
  const curve = denseCurve(edge, edgeMm);
  const length = curve.cum[curve.cum.length - 1] as number;
  if (!(length > 1e-9)) {
    throw new InvalidInputError('mesh', `edge ${edge.id} has no length`);
  }
  return { curve, length };
}

/** Nombre de parts et échantillons d'un bord : proche de h, plus pour un bord courbe dont la flèche dépasse h/20. */
function naturalSamples(
  curve: Curve,
  length: number,
  edgeMm: number,
  maxParts: number,
): { n: number; samples: Float64Array } {
  assertVertexBudget(Math.ceil(length / edgeMm), maxParts);
  let n = segmentCount(length, edgeMm);
  let samples = resample(curve, n);
  if (curve.dense.length > 4) {
    const limit = Math.ceil(length / (edgeMm / 4));
    while (n < limit && maxSag(curve, samples, n) > FLATNESS_RATIO * edgeMm) {
      n++;
      assertVertexBudget(n, maxParts);
      samples = resample(curve, n);
    }
  }
  return { n, samples };
}

/** Longueur (ligne dense) d'un bord et nombre de parts que `flattenPanelOutline` lui donnerait seul. */
export function edgeSampling(
  edge: Edge,
  edgeMm: number,
  maxParts = MAX_VERTICES_PER_GARMENT,
): { lengthMm: number; segments: number } {
  const { curve, length } = planEdge(edge, edgeMm);
  return { lengthMm: length, segments: naturalSamples(curve, length, edgeMm, maxParts).n };
}

function sampleEdge(
  edge: Edge,
  edgeMm: number,
  forced: number | undefined,
  maxParts: number,
): Float64Array {
  const { curve, length } = planEdge(edge, edgeMm);
  if (forced === undefined) return naturalSamples(curve, length, edgeMm, maxParts).samples;
  assertVertexBudget(forced, maxParts);
  if (!Number.isInteger(forced) || forced < 1) {
    throw new InvalidInputError(
      'mesh',
      `edge ${edge.id}: segment count must be a positive integer`,
    );
  }
  return resample(curve, forced);
}

/** Toutes les coordonnées de la pièce (bords, contrôles, droit fil) sont finies et d'au plus `MAX_COORDINATE_MM`. */
export function assertPanelCoordinates(panel: Panel): void {
  const points: Point[] = [];
  for (const e of panel.edges) points.push(e.from, e.to, ...(e.controls ?? []));
  points.push(...(panel.grainline ?? []));
  for (const p of points) {
    for (const c of [p[0], p[1]]) {
      if (!(Math.abs(c) <= MAX_COORDINATE_MM)) {
        throw new InvalidInputError(
          'mesh',
          `panel ${panel.id}: coordinates must be finite and within ${MAX_COORDINATE_MM} mm`,
        );
      }
    }
  }
}

function checkClosed(edges: readonly Edge[]): void {
  edges.forEach((e, i) => {
    const next = (edges[(i + 1) % edges.length] as Edge).from;
    const [dx, dy] = [e.to[0] - next[0], e.to[1] - next[1]];
    if (Math.sqrt(dx * dx + dy * dy) > GAP_MM) {
      throw new InvalidInputError('mesh', `outline is not closed after edge ${e.id}`);
    }
  });
}

/**
 * Contour d'une pièce rééchantillonné au pas `edgeMm`. `pointsMm` : x, y de chaque point du contour fermé (le
 * premier n'est pas répété) ; le bord i va du point `edgeStarts[i]` à `edgeStarts[i + 1]` (le dernier bord, au point
 * 0), extrémités comprises. Les bords droits sont découpés en parts égales (chacune ≤ 1,2 h) ; les bords courbes
 * (Bézier quadratique ou cubique) aussi, par abscisse curviligne, avec plus de parts tant que la flèche des cordes
 * dépasse h/20. `edgeSegments` (index de bord → nombre de parts) impose le nombre de parts de certains bords
 * (coutures : même nombre de points des deux côtés), sans contrôle de flèche.
 */
export function flattenPanelOutline(
  panel: Panel,
  edgeMm: number,
  edgeSegments?: ReadonlyMap<number, number>,
  maxVertices = MAX_VERTICES_PER_GARMENT,
): { pointsMm: Float64Array; edgeStarts: Uint32Array } {
  if (!(edgeMm > 0)) throw new InvalidInputError('mesh', 'edgeMm must be positive');
  if (panel.edges.length > MAX_EDGES_PER_GARMENT) assertWithinDrapeLimits(panel.edges.length, 0);
  assertPanelCoordinates(panel);
  checkClosed(panel.edges);
  const parts: Float64Array[] = [];
  const edgeStarts = new Uint32Array(panel.edges.length);
  let count = 0;
  panel.edges.forEach((edge, i) => {
    const samples = sampleEdge(edge, edgeMm, edgeSegments?.get(i), maxVertices - count);
    const n = samples.length / 2 - 1;
    parts.push(samples.subarray(0, 2 * n));
    edgeStarts[i] = count;
    count += n;
  });
  const pointsMm = new Float64Array(2 * count);
  let at = 0;
  for (const p of parts) {
    pointsMm.set(p, at);
    at += p.length;
  }
  return { pointsMm, edgeStarts };
}

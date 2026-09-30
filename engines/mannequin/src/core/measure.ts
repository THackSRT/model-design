/*
 * Mesures « au mètre ruban » : coupe du maillage par le plan de la zone, périmètre de l'enveloppe
 * convexe ; stature, entrejambe ; points d'un anneau de mesure.
 */
import { axisOf, bounds, cross, dot, hullPerimeter, normalize } from './geometry.js';
import type { MakeHumanRing, Measured, MhModel, Vec2, Vec3 } from './types.js';

/** Zones doubles (bras, jambes) : mesurées côté gauche (x > 0). */
const LIMBS = new Set(['bicep', 'wrist', 'thigh', 'knee', 'calf', 'ankle']);
/** Zones dont le plan est perpendiculaire au bras (et non horizontal). */
const ARMS = new Set(['bicep', 'wrist']);

/** Triangles (sommets de base) et sommets de la zone ; `leftOnly` : côté x > 0 seulement. */
interface Zone {
  tris: Uint16Array;
  inRegion: Uint8Array;
  leftOnly: boolean;
}

interface Plane {
  center: Vec3;
  normal: Vec3;
  u: Vec3;
  w: Vec3;
}

const vertex = (pos: Float32Array, i: number): Vec3 => [
  pos[3 * i] as number,
  pos[3 * i + 1] as number,
  pos[3 * i + 2] as number,
];

/** Plan de coupe de normale n passant par c, avec une base (u, w) du plan. */
function planeAt(center: Vec3, normal: Vec3): Plane {
  const ref: Vec3 = Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = normalize(cross(normal, ref));
  const w = cross(normal, u);
  return { center, normal, u, w };
}

/** Points de la coupe (dans le plan), pour les triangles de la zone ; `leftOnly` : côté x > 0. */
function sectionPoints(pos: Float32Array, plane: Plane, zone: Zone): Vec2[] {
  const { center: c, normal: n, u, w } = plane;
  const { tris: T, inRegion, leftOnly } = zone;
  const sec: Vec2[] = [];
  const dist = (i: number): number =>
    ((pos[3 * i] as number) - c[0]) * n[0] +
    ((pos[3 * i + 1] as number) - c[1]) * n[1] +
    ((pos[3 * i + 2] as number) - c[2]) * n[2];
  for (let t = 0; t < T.length; t += 3) {
    const vs: [number, number, number] = [T[t] as number, T[t + 1] as number, T[t + 2] as number];
    if (!(inRegion[vs[0]] || inRegion[vs[1]] || inRegion[vs[2]])) continue;
    if (leftOnly && vs.some((v) => (pos[3 * v] as number) <= 0)) continue;
    const ds = vs.map(dist) as Vec3;
    for (let e = 0; e < 3; e++) {
      const i = vs[e] as number;
      const j = vs[(e + 1) % 3] as number;
      const di = ds[e] as number;
      const dj = ds[(e + 1) % 3] as number;
      if (di > 0 === dj > 0) continue;
      const f = di / (di - dj);
      const a = vertex(pos, i);
      const b = vertex(pos, j);
      const p: Vec3 = [
        a[0] + (b[0] - a[0]) * f - c[0],
        a[1] + (b[1] - a[1]) * f - c[1],
        a[2] + (b[2] - a[2]) * f - c[2],
      ];
      sec.push([dot(p, u), dot(p, w)]);
    }
  }
  return sec;
}

/**
 * Tour mesuré dans une zone : coupe du maillage par le plan de la zone, puis périmètre
 * de l'enveloppe convexe (comme un mètre ruban). Zones doubles (bras, jambes) : côté gauche (x > 0).
 */
export function circumference(
  model: MhModel,
  pos: Float32Array,
  key: string,
  scale: number,
): MakeHumanRing {
  const region = model.regions[key];
  if (!region) throw new Error(`Zone de mesure inconnue : ${key}`);
  const bilateral = LIMBS.has(key);
  const pick = (list: number[]): Vec3[] =>
    (bilateral ? list.filter((i) => (pos[3 * i] as number) > 0) : list).map((i) => vertex(pos, i));
  const band = pick(region.band);
  const count = band.length;
  const c = [0, 1, 2].map((q) => band.reduce((a, p) => a + (p[q] as number), 0) / count) as Vec3;
  const n: Vec3 = ARMS.has(key) ? axisOf(pick(region.verts)) : [0, 1, 0];
  const plane = planeAt(c, n);
  const sec = sectionPoints(pos, plane, {
    tris: model.trisBase,
    inRegion: region.inRegion,
    leftOnly: bilateral,
  });
  const h = hullPerimeter(sec);
  return { value: h.per * scale, ...plane, hull: h.hull, side: bilateral };
}

/** Hauteur d'entrejambe : point le plus bas du bassin entre les jambes. */
export function crotchHeight(model: MhModel, pos: Float32Array, minY: number): number {
  const hip = (model.regions['hip'] as { verts: number[] }).verts;
  let hy = 0;
  for (const i of hip) hy += pos[3 * i + 1] as number;
  hy /= hip.length;
  let best = Infinity;
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[3 * i] as number;
    const y = pos[3 * i + 1] as number;
    if (Math.abs(x) < 1.2 && y < hy && y > minY + (hy - minY) * 0.5 && y < best) best = y;
  }
  return best - minY;
}

/** Mesure l'ensemble du mannequin (cm), après mise à l'échelle de la stature. */
export function measure(model: MhModel, pos: Float32Array, stature: number | null): Measured {
  const b = bounds(pos);
  const s = stature ? stature / (b.maxY - b.minY) : 1;
  const out: Record<string, number> = { scale: s, stature: (b.maxY - b.minY) * s };
  const rings: Record<string, MakeHumanRing> = {};
  for (const k of Object.keys(model.regions)) {
    const r = circumference(model, pos, k, s);
    out[k] = r.value;
    rings[k] = r;
  }
  out['crotch'] = crotchHeight(model, pos, b.minY) * s;
  out['minY'] = b.minY;
  return Object.assign(out, { rings });
}

/** Points 3D d'un anneau de mesure, pour l'afficher sur le mannequin. */
export function ringPoints(ring: MakeHumanRing): Vec3[] {
  return ring.hull.map(([a, b]) => [
    ring.center[0] + ring.u[0] * a + ring.w[0] * b,
    ring.center[1] + ring.u[1] * a + ring.w[1] * b,
    ring.center[2] + ring.u[2] * a + ring.w[2] * b,
  ]);
}

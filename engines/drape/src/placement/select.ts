import type { Crossings } from './section.js';
import type { Frame } from './frames.js';
import type { AvatarArm, AvatarShape, P2, Vec3 } from './types.js';

// Choix des points de coupe qui comptent pour une zone : tronc (et jambes) pour `torso`, une jambe pour `leg`, un
// bras pour `arm`. Les composantes sont celles de la coupe du maillage fermé (voir section.ts).

/** Rayon autour de l'axe d'un bras en deçà duquel une composante est un bras (mm). */
const ARM_TUBE_MM = 140;
/** Prolongement de l'axe du bras au-delà du poignet : la main (mm). */
const HAND_MM = 250;
/** Rayon maximal d'une section de bras autour de son axe (mm) : écarte le tronc d'une coupe fusionnée. */
const ARM_RADIUS_MM = 150;
/** Une composante dont les points s'étendent de plus de cette valeur de chaque côté de x = 0 réunit les deux jambes (mm). */
const STRADDLE_MM = 40;

interface Component {
  /** Indices des points de coupe. */
  points: number[];
}

function groups(cr: Crossings): Component[] {
  const out: Component[] = [];
  for (let i = 0; i < cr.count; i++) {
    const id = cr.component[i] as number;
    (out[id] ??= { points: [] }).points.push(i);
  }
  return out;
}

function distanceToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const w: Vec3 = [p[0] - a[0], p[1] - a[1], p[2] - a[2]];
  const l2 = d[0] * d[0] + d[1] * d[1] + d[2] * d[2];
  const t = l2 > 0 ? Math.max(0, Math.min(1, (w[0] * d[0] + w[1] * d[1] + w[2] * d[2]) / l2)) : 0;
  const x = w[0] - t * d[0];
  const y = w[1] - t * d[1];
  const z = w[2] - t * d[2];
  return Math.sqrt(x * x + y * y + z * z);
}

function nearArm(p: Vec3, arm: AvatarArm): boolean {
  const end: Vec3 = [
    arm.wristMm[0] + arm.axis[0] * HAND_MM,
    arm.wristMm[1] + arm.axis[1] * HAND_MM,
    arm.wristMm[2] + arm.axis[2] * HAND_MM,
  ];
  return distanceToSegment(p, arm.shoulderMm, end) <= ARM_TUBE_MM;
}

function pointAt(cr: Crossings, i: number): Vec3 {
  return [cr.xyz[3 * i] as number, cr.xyz[3 * i + 1] as number, cr.xyz[3 * i + 2] as number];
}

/** Vrai si tous les points de la composante sont dans le tube d'un bras (une main posée seule, un avant-bras). */
function isArm(cr: Crossings, c: Component, avatar: AvatarShape): boolean {
  return [avatar.arms.left, avatar.arms.right].some((arm) =>
    c.points.every((i) => nearArm(pointAt(cr, i), arm)),
  );
}

/** Coordonnées (a, b) d'un point de coupe dans le plan du repère au niveau l. */
function planar(frame: Frame, l: number, cr: Crossings, i: number): P2 {
  const o = frame.origin(l);
  const d = [0, 1, 2].map((k) => (cr.xyz[3 * i + k] as number) - (o[k] as number));
  const dotWith = (e: Vec3): number =>
    (d[0] as number) * e[0] + (d[1] as number) * e[1] + (d[2] as number) * e[2];
  return [dotWith(frame.e1), dotWith(frame.e2)];
}

function torsoPoints(frame: Frame, l: number, cr: Crossings, avatar: AvatarShape): P2[] {
  return groups(cr)
    .filter((c) => !isArm(cr, c, avatar))
    .flatMap((c) => c.points.map((i) => planar(frame, l, cr, i)));
}

function legPoints(frame: Frame, l: number, cr: Crossings, avatar: AvatarShape): P2[] {
  const sign = frame.side === 'left' ? 1 : -1;
  const out: P2[] = [];
  for (const c of groups(cr)) {
    if (isArm(cr, c, avatar)) continue;
    const pts = c.points.map((i) => planar(frame, l, cr, i));
    const lo = Math.min(...pts.map((p) => p[0]));
    const hi = Math.max(...pts.map((p) => p[0]));
    if (lo < -STRADDLE_MM && hi > STRADDLE_MM) {
      out.push(...pts.filter((p) => sign * p[0] >= 0));
    } else if (sign * (lo + hi) > 0) out.push(...pts);
  }
  return out;
}

function armPoints(frame: Frame, l: number, cr: Crossings): P2[] {
  const near = groups(cr)
    .map((c) => c.points.map((i) => planar(frame, l, cr, i)))
    .map((pts) => ({ pts, d: Math.min(...pts.map((p) => norm(p))) }))
    .filter((c) => Number.isFinite(c.d));
  if (near.length === 0) return [];
  const best = near.reduce((m, c) => (c.d < m.d ? c : m));
  return best.pts.filter((p) => norm(p) <= ARM_RADIUS_MM);
}

/** Points (a, b) de la section de la zone du repère, au niveau l ; vide si le plan ne coupe rien d'utile. */
export function sectionPoints(frame: Frame, l: number, cr: Crossings, avatar: AvatarShape): P2[] {
  if (frame.zone === 'torso') return torsoPoints(frame, l, cr, avatar);
  if (frame.zone === 'leg') return legPoints(frame, l, cr, avatar);
  return armPoints(frame, l, cr);
}

const norm = (p: P2): number => Math.sqrt(p[0] * p[0] + p[1] * p[1]);

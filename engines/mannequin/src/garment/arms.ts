/*
 * Bras à l'horizontale (pose en T) : à cette pose, une coupe horizontale au-dessus de l'aisselle traverse
 * les bras sur toute leur longueur et les soude au tronc. Les points de bras se reconnaissent par la pose
 * (distance à l'axe épaule-poignet, vers l'extérieur de l'épaule), pas par le nombre de parties. Les manches
 * sont des tubes autour de cet axe. Unités : cm (le corps), mm à l'entrée (`ArmMm`).
 */
import { cross, dot, normalize } from '../core/geometry.js';
import type { Vec2, Vec3 } from '../core/types.js';
import type { Tube } from './mesh.js';
import { MIN_GAP_CM } from './ring.js';
import type { DropPoint } from './section.js';

/** Pivot de l'épaule et axe unitaire épaule vers poignet d'un bras (sous-ensemble de `ArmMm`, mm). */
export interface ArmAxis {
  shoulder: Vec3;
  axis: Vec3;
  /** Longueur épaule-poignet, mm : au-delà, tout est main. */
  lengthMm: number;
}

export interface DressArms {
  left: ArmAxis;
  right: ArmAxis;
}

/** Écart du bras à la verticale à partir duquel les coupes horizontales traversent les bras (degrés). */
const RAISED_DEG = 45;
/** Distance à l'axe sous laquelle un sommet est un point de bras (cm) : le bras est coudé, l'axe épaule-poignet est une corde. */
const ARM_REACH_CM = 12;
const SLAB_CM = 1;
/** Tranches près de l'épaule dont on ne lit pas le rayon (4 cm). */
const SHOULDER_SLABS = 4;

/** Un bras est levé quand son axe s'écarte de plus de 45° de la verticale descendante. */
const isRaised = (arm: ArmAxis): boolean => arm.axis[1] > -Math.cos((RAISED_DEG * Math.PI) / 180);

export const armsRaised = (arms: DressArms | undefined): arms is DressArms =>
  arms !== undefined && isRaised(arms.left) && isRaised(arms.right);

const toCm = (p: Vec3): Vec3 => [p[0] / 10, p[1] / 10, p[2] / 10];

/** Position d'un point par rapport au bras : abscisse le long de l'axe depuis le pivot, distance à l'axe (cm). */
function along(arm: ArmAxis, x: number, y: number, z: number): { t: number; d: number } {
  const s = toCm(arm.shoulder);
  const v: Vec3 = [x - s[0], y - s[1], z - s[2]];
  const t = dot(v, arm.axis);
  return { t, d: Math.sqrt(Math.max(0, dot(v, v) - t * t)) };
}

/**
 * Écarte d'une coupe les points de bras : au-delà du pivot (vers l'extérieur) et à moins de 12 cm de l'axe,
 * ou au-delà du poignet (la main peut s'écarter de l'axe).
 */
export function armDrop(arms: DressArms): DropPoint {
  return (x, y, z) =>
    [arms.left, arms.right].some((arm) => {
      const { t, d } = along(arm, x, y, z);
      return t > 0 && (d < ARM_REACH_CM || t > arm.lengthMm / 10);
    });
}

/** Section du bras dans une tranche de 1 cm le long de l'axe : centre (dans le plan u, v) et rayon (cm). */
interface Slab {
  cu: number;
  cv: number;
  radius: number;
}

/**
 * Sections du bras par tranche : le bras est coudé, la corde épaule-poignet s'en écarte. Le centre est celui
 * de la boîte des points de bras de la tranche, le rayon leur plus grande distance à ce centre.
 */
function armSlabs(arm: ArmAxis, positions: ArrayLike<number>, lengthCm: number): Slab[] {
  const [u, v] = planeBasis(arm.axis);
  const origin = toCm(arm.shoulder);
  const slabs: Vec2[][] = Array.from({ length: Math.ceil(lengthCm / SLAB_CM) + 1 }, () => []);
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const p: Vec3 = [
      positions[i] as number,
      positions[i + 1] as number,
      positions[i + 2] as number,
    ];
    const { t, d } = along(arm, p[0], p[1], p[2]);
    const slab = slabs[Math.floor(t / SLAB_CM)];
    if (t < 0 || !slab || d >= ARM_REACH_CM) continue;
    const rel: Vec3 = [p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]];
    slab.push([dot(rel, u), dot(rel, v)]);
  }
  return slabs.map((pts) => {
    if (pts.length === 0) return { cu: 0, cv: 0, radius: 0 };
    const mid = (q: 0 | 1): number =>
      (Math.min(...pts.map((p) => p[q])) + Math.max(...pts.map((p) => p[q]))) / 2;
    const [cu, cv] = [mid(0), mid(1)];
    return { cu, cv, radius: Math.max(...pts.map((p) => Math.hypot(p[0] - cu, p[1] - cv))) };
  });
}

/** Cotes d'une manche : longueur (mm) et tour fini (mm) à la distance `fromHemMm` de l'ourlet. */
export interface SleeveShape {
  lengthMm: number;
  girthMm: (fromHemMm: number) => number;
}

/** Repère orthonormé (u, v) du plan perpendiculaire à l'axe, tel que u x v = axe (normales vers l'extérieur). */
function planeBasis(axis: Vec3): [Vec3, Vec3] {
  const ref: Vec3 = Math.abs(axis[1]) < 0.9 ? [0, 1, 0] : [0, 0, 1];
  const u = normalize(cross(axis, ref));
  return [u, cross(axis, u)];
}

/** Échantillonnage d'une manche : directions autour de l'axe, nombre d'anneaux, longueur demandée (mm). */
export interface SleeveGrid {
  dirs: Vec2[];
  count: number;
  lengthMm?: number;
}

/** Une manche et le nombre de stations où le bras a forcé un rayon plus grand que celui du patron. */
export interface SleeveFit {
  tube: Tube;
  forced: number;
}

/**
 * Manche d'un bras : rayon = tour du patron / 2π, sauf là où le bras est plus large (le tissu n'entre jamais
 * dans le bras : rayon du bras + 0,5 mm, station comptée dans `forced`). Centrée sur l'axe épaule-poignet,
 * décalée vers le centre du bras là où il s'en écarte.
 */
function sleeveTube(
  arm: ArmAxis,
  positions: ArrayLike<number>,
  shape: SleeveShape,
  grid: SleeveGrid,
): SleeveFit {
  const { dirs, count } = grid;
  const lengthCm = shape.lengthMm / 10;
  const slabs = armSlabs(arm, positions, lengthCm);
  const [u, v] = planeBasis(arm.axis);
  const origin = toCm(arm.shoulder);
  const lastSlab = Math.floor(arm.lengthMm / 10 / SLAB_CM);
  let forced = 0;
  const rings = Array.from({ length: count }, (_, k) => {
    const sCm = (lengthCm * k) / (count - 1);
    const pattern = shape.girthMm(shape.lengthMm - sCm * 10) / 10 / (2 * Math.PI);
    // Près de l'épaule le nuage mêle tronc et deltoïde ; au-delà du poignet, c'est la main : on y garde
    // la section la plus proche.
    const index = Math.min(Math.max(Math.floor(sCm / SLAB_CM), SHOULDER_SLABS), lastSlab);
    const slab = slabs[index] ?? { cu: 0, cv: 0, radius: 0 };
    const body = slab.radius > 0 ? slab.radius + MIN_GAP_CM : 0;
    if (body > pattern) forced++;
    const r = Math.max(pattern, body);
    const c = origin.map(
      (o, q) =>
        o + sCm * (arm.axis[q] as number) + slab.cu * (u[q] as number) + slab.cv * (v[q] as number),
    );
    return {
      points3: dirs.map(
        (d): Vec3 =>
          [0, 1, 2].map(
            (q) => (c[q] as number) + r * (d[0] * (u[q] as number) + d[1] * (v[q] as number)),
          ) as Vec3,
      ),
    };
  });
  return { tube: { rings, closed: false }, forced };
}

/** Une manche par bras, de l'épaule au poignet (et au-delà si la manche est plus longue que le bras). */
export function sleeveFits(
  arms: DressArms,
  positions: ArrayLike<number>,
  shape: SleeveShape,
  grid: SleeveGrid,
): SleeveFit[] {
  return [arms.left, arms.right].map((arm) => sleeveTube(arm, positions, shape, grid));
}

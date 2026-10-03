import { pointAt } from './hull.js';
import { LEVEL_STEP_MM, type LevelCurve, type LevelStack } from './levels.js';
import type { PieceField } from './piece-field.js';
import type { P2 } from './types.js';

// Départ en godets d'un tube du tronc évasé (ADR 0013, « Jupe cercle : départ en godets »). Pour une pièce sous l'ancre dont
// le tour fini dépasse la courbe du corps décalée de plus de 5 % à son niveau le plus large (la mise en godets
// vaut alors pour tous ses niveaux, l'amplitude est nulle où la courbe suffit : pas de saut), la courbe garde sa taille (enveloppe cumulée, jamais
// agrandie) et l'excédent de longueur est plissé en ondes radiales vers l'extérieur, de profil 16u²(1 − u)² sur chaque
// godet. Une pièce porte un nombre entier de godets, un par 150 mm de sa part de courbe au niveau le plus large, au
// moins un, avec un creux à chacun de ses bouts (là où sont les coutures). L'amplitude de chaque niveau est trouvée
// par dichotomie (40 tours) pour que la longueur de la courbe ondulée égale la longueur de l'isoligne ; l'abscisse
// d'un sommet se prend le long de cette courbe, d'où une isoligne posée à sa longueur. La hauteur est le repère moins
// ∫ √(1 − (dr/dd)²) dd (r : distance moyenne du niveau au centre), la pente radiale est retirée. La position est
// interpolée entre deux niveaux. Seulement + − × ÷ et Math.sqrt, en ordre fixe.

/** Tour fini / courbe au-delà duquel un niveau est mis en godets. */
export const GODET_RATIO = 1.05;
/** Longueur de courbe par godet, mm. */
export const GODET_SPAN_MM = 150;
/** Tours de la dichotomie sur l'amplitude. */
const BISECTION_TURNS = 40;
/** Amplitude maximale cherchée, mm. */
const MAX_AMPLITUDE_MM = 2000;
/** Points d'échantillonnage de la courbe ondulée par godet. */
const SAMPLES_PER_GODET = 60;
/** Moyenne du profil 16u²(1 − u)² sur un godet : 16 / 30. */
const MEAN_PROFILE = 16 / 30;
/** Pente radiale retirée au plus : la hauteur monte au moins de cette part du pas (10 %). */
const MIN_RISE = 0.1;

export interface GodetEnv {
  stack: LevelStack;
  field: PieceField;
  /** Tour fini du tube (mm) à `up` mm au-dessus du niveau d'ancrage. */
  circumference(up: number): number;
}

export interface GodetPoint {
  /** Hauteur sous l'ancrage (mm, positive vers le bas). */
  drop: number;
  ab: P2;
  /** Tour fini / courbe du niveau le plus évasé des deux niveaux utilisés. */
  ratio: number;
}

export interface GodetPlacer {
  /** Point de la pièce à l'abscisse lissée `t` (`PieceField.t`) et à la profondeur d, ou `undefined` si les niveaux voisins ne sont pas assez évasés. */
  place(t: number, d: number): GodetPoint | undefined;
}

/** Courbe ondulée d'un niveau, pour une pièce. */
export interface Ring {
  level: LevelCurve;
  /** Amplitude des godets (mm) et nombre de godets. */
  amplitude: number;
  godets: number;
  /** Longueur de l'isoligne de la pièce (mm). */
  length: number;
  /** Intervalle d'abscisses sur la courbe du corps. */
  from: number;
  to: number;
  /** Paramètre sur la courbe et longueur cumulée de la courbe ondulée, aux points d'échantillonnage. */
  params: Float64Array;
  lengths: Float64Array;
}

/** Profil d'un godet : 16u²(1 − u)², 0 aux bouts, 1 au milieu. */
export const godetProfile = (u: number): number => 16 * u * u * (1 - u) * (1 - u);

const fractionOf = (x: number): number => x - Math.floor(x);

/** Point de la courbe du corps à l'abscisse t, poussé de `shift` mm vers l'extérieur depuis le centre. */
function wavyPoint(level: LevelCurve, t: number, shift: number): P2 {
  const q = pointAt(level.curve, t);
  const dx = q[0] - level.centre[0];
  const dy = q[1] - level.centre[1];
  const r = Math.sqrt(dx * dx + dy * dy) || 1;
  return [q[0] + (shift * dx) / r, q[1] + (shift * dy) / r];
}

/** Distance moyenne des points de la courbe du niveau à son centre. */
function meanRadius(level: LevelCurve): number {
  let sum = 0;
  for (const p of level.curve.points) {
    const dx = p[0] - level.centre[0];
    const dy = p[1] - level.centre[1];
    sum += Math.sqrt(dx * dx + dy * dy);
  }
  return sum / level.curve.points.length;
}

/** Points de base (hors ondes) de l'intervalle : abscisses, positions et directions vers l'extérieur. */
interface Samples {
  t: Float64Array;
  x: Float64Array;
  y: Float64Array;
  nx: Float64Array;
  ny: Float64Array;
  /** Profil de l'onde en chaque point. */
  g: Float64Array;
}

function sampleBase(level: LevelCurve, from: number, to: number, godets: number): Samples {
  const m = SAMPLES_PER_GODET * godets;
  const s: Samples = {
    t: new Float64Array(m + 1),
    x: new Float64Array(m + 1),
    y: new Float64Array(m + 1),
    nx: new Float64Array(m + 1),
    ny: new Float64Array(m + 1),
    g: new Float64Array(m + 1),
  };
  for (let i = 0; i <= m; i++) {
    const t = from + ((to - from) * i) / m;
    const q = pointAt(level.curve, t);
    const dx = q[0] - level.centre[0];
    const dy = q[1] - level.centre[1];
    const r = Math.sqrt(dx * dx + dy * dy) || 1;
    s.t[i] = t;
    s.x[i] = q[0];
    s.y[i] = q[1];
    s.nx[i] = dx / r;
    s.ny[i] = dy / r;
    s.g[i] = godetProfile(fractionOf((i * godets) / m));
  }
  return s;
}

/** Longueurs cumulées de la courbe ondulée d'amplitude `a` aux points de `s` (écrites dans `out`). */
function cumulate(s: Samples, a: number, out: Float64Array): number {
  let px = (s.x[0] as number) + a * (s.g[0] as number) * (s.nx[0] as number);
  let py = (s.y[0] as number) + a * (s.g[0] as number) * (s.ny[0] as number);
  out[0] = 0;
  for (let i = 1; i < s.t.length; i++) {
    const shift = a * (s.g[i] as number);
    const x = (s.x[i] as number) + shift * (s.nx[i] as number);
    const y = (s.y[i] as number) + shift * (s.ny[i] as number);
    out[i] = (out[i - 1] as number) + Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
    px = x;
    py = y;
  }
  return out[s.t.length - 1] as number;
}

/** Amplitude pour que la courbe ondulée mesure `target` ; 0 si la courbe du corps est déjà assez longue. */
function solveAmplitude(s: Samples, target: number, scratch: Float64Array): number {
  if (cumulate(s, 0, scratch) >= target) return 0;
  let lo = 0;
  let hi = MAX_AMPLITUDE_MM;
  for (let turn = 0; turn < BISECTION_TURNS; turn++) {
    const mid = (lo + hi) / 2;
    if (cumulate(s, mid, scratch) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Longueur (mm) de la courbe ondulée de l'anneau : sert à vérifier qu'elle égale celle de l'isoligne. */
export function ringLength(ring: Ring): number {
  return ring.lengths[ring.lengths.length - 1] as number;
}

/** Point (a, b) de l'anneau à la longueur `ell` depuis le début de la pièce. */
export function ringPoint(ring: Ring, ell: number): P2 {
  const { lengths, params } = ring;
  const clamped = Math.max(0, Math.min(ringLength(ring), ell));
  let lo = 0;
  let hi = lengths.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if ((lengths[mid] as number) <= clamped) lo = mid;
    else hi = mid;
  }
  const span = (lengths[hi] as number) - (lengths[lo] as number);
  const w = span > 0 ? (clamped - (lengths[lo] as number)) / span : 0;
  const t = (params[lo] as number) + w * ((params[hi] as number) - (params[lo] as number));
  const u = fractionOf(((t - ring.from) / (ring.to - ring.from)) * ring.godets);
  return wavyPoint(ring.level, t, ring.amplitude * godetProfile(u));
}

/** Anneau d'un niveau : godets de la pièce sur la part de courbe qui lui revient. */
export function buildRing(
  level: LevelCurve,
  line: { startArc: number; scale: number; lo: number; hi: number; godets: number },
): Ring {
  const from = line.startArc + line.scale * line.lo;
  const to = line.startArc + line.scale * line.hi;
  const length = line.hi - line.lo;
  const samples = sampleBase(level, from, to, line.godets);
  const lengths = new Float64Array(samples.t.length);
  const amplitude = solveAmplitude(samples, length, lengths);
  cumulate(samples, amplitude, lengths);
  return {
    level,
    amplitude,
    godets: line.godets,
    length,
    from,
    to,
    params: samples.t,
    lengths,
  };
}

/** Anneaux (courbes ondulées) d'une pièce, par niveau, et rapport tour fini / courbe. */
interface Rings {
  ratioAt(k: number): number;
  ringAt(k: number): Ring;
  /** Pièce évasée : son tour fini dépasse la courbe de plus de 5 % à son niveau le plus large. */
  flared(): boolean;
}

function ringsOf(env: GodetEnv, dMax: number): Rings {
  const { stack, field } = env;
  const rings = new Map<number, Ring>();
  const ratios = new Map<number, number>();
  let godets = 0;
  let wide: boolean | undefined;

  const ratioAt = (k: number): number => {
    const known = ratios.get(k);
    if (known !== undefined) return known;
    const total = env.circumference(-Math.min(k * LEVEL_STEP_MM, dMax));
    const ratio = total / stack.curveAt(-k).curve.length;
    ratios.set(k, ratio);
    return ratio;
  };

  const lineAt = (k: number, count: number) => {
    const level = stack.curveAt(-k);
    const dd = Math.min(k * LEVEL_STEP_MM, dMax);
    const [lo, hi] = field.tSpan(dd);
    const scale = level.curve.length / env.circumference(-dd);
    return { startArc: level.startArc, scale, lo, hi, godets: count };
  };

  /** Un godet par 150 mm de la part de courbe de la pièce au niveau le plus large (au moins un). */
  const godetCount = (): number => {
    if (godets > 0) return godets;
    const line = lineAt(Math.max(1, Math.ceil(dMax / LEVEL_STEP_MM)), 1);
    godets = Math.max(1, Math.floor(((line.hi - line.lo) * line.scale) / GODET_SPAN_MM + 0.5));
    return godets;
  };

  const ringAt = (k: number): Ring => {
    const known = rings.get(k);
    if (known) return known;
    const ring = buildRing(stack.curveAt(-k), lineAt(k, godetCount()));
    rings.set(k, ring);
    return ring;
  };

  const flared = (): boolean => {
    wide ??= ratioAt(Math.ceil(dMax / LEVEL_STEP_MM)) > GODET_RATIO;
    return wide;
  };
  return { ratioAt, ringAt, flared };
}

/** Hauteur sous l'ancrage de chaque niveau : le pas moins la pente radiale (rayon moyen de la courbe ondulée). */
function dropsOf(stack: LevelStack, ringAt: (k: number) => Ring): (k: number) => number {
  const radii: number[] = [];
  const drops: number[] = [0];
  const radiusAt = (k: number): number => {
    for (let i = radii.length; i <= k; i++) {
      radii.push(meanRadius(stack.curveAt(-i)) + MEAN_PROFILE * ringAt(i).amplitude);
    }
    return radii[k] as number;
  };
  return (k) => {
    for (let i = drops.length; i <= k; i++) {
      const slope = (radiusAt(i) - radiusAt(i - 1)) / LEVEL_STEP_MM;
      const rise = Math.sqrt(Math.max(MIN_RISE, 1 - slope * slope));
      drops.push((drops[i - 1] as number) + LEVEL_STEP_MM * rise);
    }
    return drops[k] as number;
  };
}

export function createGodetPlacer(env: GodetEnv): GodetPlacer {
  const { field } = env;
  let dMax = -Infinity;
  for (const d of field.d) dMax = Math.max(dMax, d);
  const { ratioAt, ringAt, flared } = ringsOf(env, dMax);
  const dropAt = dropsOf(env.stack, ringAt);
  const along = (ring: Ring, fraction: number): P2 => ringPoint(ring, fraction * ringLength(ring));

  return {
    place(t, d) {
      if (!flared()) return undefined;
      const depth = Math.max(0, Math.min(d, dMax));
      const [lo, hi] = field.tSpan(depth);
      const fraction = hi > lo ? (t - lo) / (hi - lo) : 0.5;
      const k = Math.floor(depth / LEVEL_STEP_MM);
      const w = depth / LEVEL_STEP_MM - k;
      const [a, b] = [along(ringAt(k), fraction), along(ringAt(k + 1), fraction)];
      return {
        drop: dropAt(k) + w * (dropAt(k + 1) - dropAt(k)),
        ab: [a[0] + w * (b[0] - a[0]), a[1] + w * (b[1] - a[1])],
        ratio: Math.max(ratioAt(k), ratioAt(k + 1)),
      };
    },
  };
}

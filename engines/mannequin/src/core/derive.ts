/*
 * Lecture du corps ajusté : repères (point d'encolure à l'épaule, acromion, aisselle, crête iliaque, à gauche et à
 * droite) et les onze mesures du contrat qu'on en déduit quand l'utilisateur ne les donne pas. Tout est lu sur le
 * corps au repos, avant la pose : les bras sont écartés d'environ 47° de la verticale (axe épaule-poignet des
 * données MakeHuman). Le résultat ne dépend donc pas de l'angle des bras demandé.
 * Unités : cm et degrés ; la conversion en mm entiers est dans `src/derived.ts`.
 *
 * Définitions (le maillage n'a pas d'os : repères géométriques) :
 * - taille, bassin, genou : zones de mesure du moteur (centres des anneaux) ;
 * - crête iliaque : à mi-hauteur entre la taille et le bassin (FreeSewing : waistToHips ≈ la moitié de waistToSeat) ;
 * - aisselle : haut du creux entre bras et tronc (`armpit.ts`) ; poitrine haute : tour du tronc 1 cm dessous ;
 * - cuisse : un dixième de la longueur de cuisse (fourche à genou) sous l'entrejambe, « juste sous l'entrejambe ».
 */
import { armpitPoint } from './armpit.js';
import { crotchPath } from './crotch.js';
import { ringPoints } from './measure.js';
import { shoulderPoints } from './shoulder.js';
import { chainHull, chainLength, largestLoop, sliceMesh } from './slice.js';
import type { MakeHumanRing, Measured, Vec3 } from './types.js';

/** Tour de poitrine haute : le tronc est coupé à cette distance sous le creux de l'aisselle (cm). */
const HIGH_BUST_BELOW_ARMPIT_CM = 1;
/** Part de la longueur de cuisse (fourche à genou) entre l'entrejambe et le niveau du tour de cuisse. */
const THIGH_LEVEL_SHARE = 0.1;
/** Écart à l'extrême latéral (cm) au sein duquel les points de coupe comptent pour le point de côté. */
const SIDE_CAP_CM = 0.2;

export interface SideLandmarksCm {
  neckShoulder: Vec3;
  acromion: Vec3;
  armpit: Vec3;
  iliacCrest: Vec3;
}

/** Les onze mesures lues sur le corps : longueurs en cm, pente d'épaule en degrés. */
export interface DerivedCm {
  highBustGirth: number;
  upperHipGirth: number;
  waistGirthBack: number;
  hipGirthBack: number;
  shoulderSlopeDeg: number;
  waistToArmpit: number;
  waistToUpperHip: number;
  crotchLength: number;
  frontCrotchLength: number;
  waistToThigh: number;
  kneeHeight: number;
}

export interface BodyReading {
  left: SideLandmarksCm;
  right: SideLandmarksCm;
  measures: DerivedCm;
}

export interface BodyInput {
  /** Positions du corps ajusté au repos (cm). */
  pos: Float32Array;
  /** Triangles en sommets de base. */
  tris: Uint16Array;
  measured: Measured;
  /** Pivots des épaules (cm). */
  pivots: { left: Vec3; right: Vec3 };
}

const ring = (m: Measured, key: string): MakeHumanRing => {
  const r = m.rings[key];
  if (!r) throw new Error(`Lecture du corps impossible : zone de mesure ${key} absente`);
  return r;
};

const mean = (a: number, b: number): number => (a + b) / 2;

/** Contour du tronc à la hauteur `y` : le plus grand contour de la coupe. */
function torsoAt(input: BodyInput, y: number): ReturnType<typeof largestLoop> {
  return largestLoop(sliceMesh(input.pos, input.tris, 1, y), 0, 2);
}

/** Tour d'un mètre ruban autour du tronc à la hauteur `y` (cm). */
function girthAt(input: BodyInput, y: number): number {
  const loop = torsoAt(input, y);
  if (!loop) throw new Error(`Lecture du corps impossible : aucun tronc à ${y} cm`);
  return chainHull(loop, 0, 2).per;
}

/**
 * Point de côté du tronc à la hauteur `y` : le plus latéral du côté `side`. Le côté du tronc est presque plat : on
 * prend le milieu des points à moins de `SIDE_CAP_CM` de l'extrême, pas le premier venu, pour que la gauche et la
 * droite se répondent.
 */
function sidePointAt(input: BodyInput, y: number, side: 1 | -1): Vec3 {
  const loop = torsoAt(input, y);
  if (!loop) throw new Error(`Lecture du corps impossible : aucun tronc à ${y} cm`);
  const extreme = Math.max(...loop.points.map((p) => side * p[0]));
  const cap = loop.points.filter((p) => side * p[0] >= extreme - SIDE_CAP_CM);
  const middle = cap.reduce((sum, p) => sum + p[2], 0) / cap.length;
  return [side * extreme, y, middle];
}

/** Part dos d'un tour : de point de côté à point de côté par l'arrière, le long de l'enveloppe de l'anneau (cm). */
function backArc(zone: MakeHumanRing): number {
  const pts = ringPoints(zone);
  const n = pts.length;
  let left = 0;
  let right = 0;
  pts.forEach((p, i) => {
    if (p[0] > (pts[left] as Vec3)[0]) left = i;
    if (p[0] < (pts[right] as Vec3)[0]) right = i;
  });
  const arc = (from: number, to: number): Vec3[] => {
    const out = [pts[from] as Vec3];
    for (let i = from; i !== to;) {
      i = (i + 1) % n;
      out.push(pts[i] as Vec3);
    }
    return out;
  };
  const rearmost = (path: Vec3[]): number => Math.min(...path.map((p) => p[2]));
  const a = arc(left, right);
  const b = arc(right, left);
  return chainLength({ points: rearmost(a) < rearmost(b) ? a : b, closed: false });
}

function sideLandmarks(input: BodyInput, side: 1 | -1, iliacY: number): SideLandmarksCm {
  const pivot = side === 1 ? input.pivots.left : input.pivots.right;
  const neck = ring(input.measured, 'neck');
  const halfWidth = Math.max(...ringPoints(neck).map((p) => Math.abs(p[0])));
  const { neckShoulder, acromion } = shoulderPoints(
    { pos: input.pos, tris: input.tris, pivot, neck: { halfWidth, y: neck.center[1] } },
    side,
  );
  return {
    neckShoulder,
    acromion,
    armpit: armpitPoint(input.pos, input.tris, side, pivot),
    iliacCrest: sidePointAt(input, iliacY, side),
  };
}

/** Pente de l'épaule vue de face : du point d'encolure à l'acromion, sous l'horizontale (degrés). */
function slopeDeg(s: SideLandmarksCm): number {
  const drop = s.neckShoulder[1] - s.acromion[1];
  return (Math.atan2(drop, Math.abs(s.acromion[0] - s.neckShoulder[0])) * 180) / Math.PI;
}

/** Lit les repères et les onze mesures sur le corps ajusté. Une zone ou un repère introuvable est une erreur. */
export function readBody(input: BodyInput): BodyReading {
  const { measured } = input;
  const waistY = ring(measured, 'waist').center[1];
  const hipY = ring(measured, 'hip').center[1];
  const kneeY = ring(measured, 'knee').center[1];
  const crotchY = measured['crotch'];
  if (crotchY === undefined) throw new Error('Lecture du corps impossible : crotch');
  const iliacY = mean(waistY, hipY);
  const left = sideLandmarks(input, 1, iliacY);
  const right = sideLandmarks(input, -1, iliacY);
  const armpitY = mean(left.armpit[1], right.armpit[1]);
  const path = crotchPath(input.pos, input.tris, waistY);
  const measures: DerivedCm = {
    highBustGirth: girthAt(input, armpitY - HIGH_BUST_BELOW_ARMPIT_CM),
    upperHipGirth: girthAt(input, iliacY),
    waistGirthBack: backArc(ring(measured, 'waist')),
    hipGirthBack: backArc(ring(measured, 'hip')),
    shoulderSlopeDeg: mean(slopeDeg(left), slopeDeg(right)),
    waistToArmpit: armpitY - waistY,
    waistToUpperHip: waistY - iliacY,
    crotchLength: path.totalCm,
    frontCrotchLength: path.frontCm,
    waistToThigh: waistY - (crotchY - THIGH_LEVEL_SHARE * (crotchY - kneeY)),
    kneeHeight: kneeY,
  };
  return { left, right, measures };
}

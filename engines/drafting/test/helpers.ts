import type { MeasurementSet } from '@atelier/contracts-ts';
import { expect } from 'vitest';
import { HPS_ABOVE_CERVICALE_RATIO } from '../src/index.js';
import type {
  DraftOptions,
  DraftRequest,
  DraftResult,
  DraftedPart,
  SizeName,
} from '../src/index.js';

/** Les cinq tailles de validation de l'essai de FreeSewing : femme 28, 34, 40, 46 et homme 42 (tour de cou en cm). */
export const VALIDATION_SIZES: readonly SizeName[] = [
  'cisFemaleAdult28',
  'cisFemaleAdult34',
  'cisFemaleAdult40',
  'cisFemaleAdult46',
  'cisMaleAdult42',
];

/** Options par défaut, puis options de base des cinq tuniques (`base` de docs/suivi/essais/tuniques/garments.mjs). */
export const BASE_OPTION_SETS: readonly DraftOptions[] = [
  {},
  { lengthBonus: 0.28, chestEase: 0.12, cuffEase: 0.4 },
  { lengthBonus: 0.24, chestEase: 0.18 },
  { lengthBonus: 0.24, chestEase: 0.15 },
  { lengthBonus: 0.34, chestEase: 0.24, bicepsEase: 0.3 },
  { lengthBonus: 0.42, chestEase: 0.14, cuffEase: 0.4 },
];

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

export const sizeRequest = (size: SizeName, options: DraftOptions = {}): DraftRequest => ({
  model: 'brian',
  measurements: { size },
  options,
});

/** Parcourt un résultat et rend tous les nombres qu'il contient. */
export function numbersIn(value: unknown): number[] {
  if (typeof value === 'number') return [value];
  if (Array.isArray(value)) return value.flatMap(numbersIn);
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(numbersIn);
  return [];
}

/** Mesures FreeSewing d'une taille (mm, degrés pour la pente d'épaule), telles que le paquet `models` les donne. */
export type FsMeasures = Readonly<Record<string, number>>;

/**
 * `MeasurementSet` équivalent aux mesures FreeSewing d'une taille : la correspondance de docs/composants/contrats.md
 * lue à l'envers. `backWaistLengthMm` retranche l'écart entre le HPS et la cervicale ; pour les tailles des tableaux
 * (tour de cou pair en cm) cet écart est un nombre entier de millimètres, donc la conversion retombe exactement sur
 * `hpsToWaistBack`.
 */
export function measurementSetOf(sex: 'female' | 'male', fs: FsMeasures): MeasurementSet {
  const at = (name: string): number => fs[name] as number;
  return {
    sex,
    statureMm: 1750,
    neckGirthMm: at('neck'),
    chestGirthMm: at('chest'),
    bustGirthMm: sex === 'female' ? at('chest') : undefined,
    highBustGirthMm: at('highBust'),
    waistGirthMm: at('waist'),
    hipGirthMm: at('seat'),
    upperArmGirthMm: at('biceps'),
    wristGirthMm: at('wrist'),
    backWaistLengthMm: Math.round(at('hpsToWaistBack') - HPS_ABOVE_CERVICALE_RATIO * at('neck')),
    neckShoulderToBustPointMm: at('hpsToBust'),
    shoulderWidthMm: at('shoulderToShoulder'),
    shoulderSlopeDeg: at('shoulderSlope'),
    armLengthMm: at('shoulderToWrist'),
    waistToArmpitMm: at('waistToArmpit'),
    waistToUpperHipMm: at('waistToHips'),
  };
}

/** Sexe d'une taille des tableaux de FreeSewing, d'après son nom. */
export const sexOf = (size: SizeName): 'female' | 'male' =>
  size.startsWith('cisFemale') ? 'female' : 'male';

/**
 * Le sommet porte le nom du point de la fiche ; ou, quand FreeSewing a confondu deux points voisins (`sitsRoughlyOn`,
 * `lengthBonus` presque nul), le point est à moins de 1,5 mm du sommet.
 */
function vertexProblem(part: DraftedPart, vertexIndex: number, pointName: string): string[] {
  const vertex = part.contour.vertices[vertexIndex];
  const point = part.points[pointName];
  if (vertex === undefined || point === undefined) {
    return [`${part.id}: no vertex ${vertexIndex} or no point ${pointName}`];
  }
  const close = Math.hypot(vertex.xMm - point.xMm, vertex.yMm - point.yMm) < 1.5;
  return vertex.names.includes(pointName) || close
    ? []
    : [`${part.id}: ${pointName} is not at vertex ${vertexIndex}`];
}

/** Contour fermé dont les segments s'enchaînent et dont tous les sommets sont nommés. */
function contourProblems(part: DraftedPart): string[] {
  const { segments, vertices } = part.contour;
  const problems: string[] = [];
  segments.forEach((segment, index) => {
    if (segment.to !== segments[(index + 1) % segments.length]?.from) {
      problems.push(`${part.id}: segment ${index} does not chain`);
    }
  });
  if (segments.at(-1)?.to !== 0) problems.push(`${part.id}: contour is not closed`);
  vertices.forEach((vertex, index) => {
    if (vertex.names.length === 0) problems.push(`${part.id}: vertex ${index} has no name`);
  });
  return problems;
}

/** Bords qui se suivent, commencent et finissent sur les points de la fiche, couvrent le contour exactement une fois. */
function edgeProblems(part: DraftedPart): string[] {
  const { edges, contour } = part;
  const problems: string[] = [];
  const covered = contour.segments.map(() => 0);
  edges.forEach((edge, index) => {
    problems.push(
      ...vertexProblem(part, edge.fromVertex, edge.fromPoint),
      ...vertexProblem(part, edge.toVertex, edge.toPoint),
    );
    if (edge.toVertex !== edges[(index + 1) % edges.length]?.fromVertex) {
      problems.push(`${part.id}: edge ${edge.id} does not lead to the next edge`);
    }
    if (!(edge.lengthMm > 0)) problems.push(`${part.id}: edge ${edge.id} has no length`);
    for (const segment of edge.segments) covered[segment] = (covered[segment] ?? 0) + 1;
  });
  if (covered.some((times) => times !== 1)) {
    problems.push(`${part.id}: contour covered ${covered.join(',')} times, expected exactly once`);
  }
  const total = (lengths: number[]): number => lengths.reduce((sum, length) => sum + length, 0);
  const gap = total(contour.segments.map((s) => s.lengthMm)) - total(edges.map((e) => e.lengthMm));
  if (Math.abs(gap) >= 0.001 * contour.segments.length) {
    problems.push(`${part.id}: edges and segments differ in length by ${gap}`);
  }
  return problems;
}

/** Tous les nombres sont finis, arrondis à 0,001 et jamais −0. */
function numberProblems(result: DraftResult): string[] {
  return numbersIn(result.parts).flatMap((value) => {
    if (!Number.isFinite(value)) return [`${value} is not finite`];
    if (Object.is(value, -0)) return ['-0 in the result'];
    return Math.abs(value * 1000 - Math.round(value * 1000)) < 1e-6
      ? []
      : [`${value} is not rounded to 0.001`];
  });
}

/**
 * Les propriétés qu'un tracé de Brian garde quelles que soient les mesures et les options : pièces dans l'ordre de la
 * fiche, contour fermé dont les segments s'enchaînent, tous ses sommets nommés, bords qui se suivent et couvrent le
 * contour exactement une fois, sorties arrondies à 0,001 mm, aucun avertissement (sauf si `allowWarnings`). Une seule
 * assertion : la liste des défauts doit être vide.
 */
export function expectValidDraft(result: DraftResult, allowWarnings = false): void {
  const problems: string[] = [];
  if (result.model !== 'brian') problems.push(`model ${result.model}`);
  const ids = result.parts.map((part) => part.id).join(',');
  if (ids !== 'front,back,sleeve') problems.push(`parts ${ids}`);
  if (!allowWarnings && result.warnings.length > 0)
    problems.push(`warnings ${result.warnings.join(' ; ')}`);
  for (const part of result.parts) problems.push(...contourProblems(part), ...edgeProblems(part));
  problems.push(...numberProblems(result));
  expect(problems).toEqual([]);
}

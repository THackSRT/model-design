/*
 * Types, bornes et conversions des mesures du contrat lues sur le corps ajusté et des repères du corps (tâche
 * 1.61a), en mm. Le cœur (`core/derive.ts`) travaille en cm : la conversion est ici, comme dans `index.ts`. Les mesures
 * sont des entiers dans les bornes de `contracts/schemas/measurement-set.schema.json` ; la pente d'épaule est en
 * degrés entiers. La lecture du corps elle-même est dans `reading.ts`.
 */
import type { MeasurementSet } from '@atelier/contracts-ts';
import type { BodyReading, DerivedCm, SideLandmarksCm } from './core/derive.js';
import type { Point3Mm } from './index.js';

/** Les onze mesures ajoutées au contrat pour FreeSewing (1.54a), que le mannequin sait lire sur son corps. */
export const DERIVED_KEYS = [
  'highBustGirthMm',
  'upperHipGirthMm',
  'waistGirthBackMm',
  'hipGirthBackMm',
  'shoulderSlopeDeg',
  'waistToArmpitMm',
  'waistToUpperHipMm',
  'crotchLengthMm',
  'frontCrotchLengthMm',
  'waistToThighMm',
  'kneeHeightMm',
] as const;

export type DerivedKey = (typeof DERIVED_KEYS)[number];

/** Les onze mesures, toutes présentes : entiers, en mm (degrés pour `shoulderSlopeDeg`). */
export type DerivedMeasurements = Required<Pick<MeasurementSet, DerivedKey>>;

/** Bornes du contrat (`minimum`, `maximum`) : une valeur lue hors bornes est ramenée à la borne. */
export const DERIVED_BOUNDS: Record<DerivedKey, readonly [number, number]> = {
  highBustGirthMm: [500, 1800],
  upperHipGirthMm: [500, 1900],
  waistGirthBackMm: [200, 1000],
  hipGirthBackMm: [300, 1100],
  shoulderSlopeDeg: [0, 45],
  waistToArmpitMm: [80, 450],
  waistToUpperHipMm: [20, 300],
  crotchLengthMm: [400, 1500],
  frontCrotchLengthMm: [150, 750],
  waistToThighMm: [100, 600],
  kneeHeightMm: [200, 700],
};

/**
 * Repères d'un côté du corps au repos, en mm (x latéral, y depuis le sol, z vers l'avant ; gauche du mannequin :
 * x > 0). Le maillage n'a pas d'os : ce sont des repères de forme, lus sur la peau.
 */
export interface SideLandmarksMm {
  /** Point d'encolure à l'épaule, côté du cou (HPS de FreeSewing, neck shoulder point de l'ISO 8559-1). */
  neckShoulderPoint: Point3Mm;
  /** Acromion : bout de l'épaule, où le dessus de l'épaule plonge dans le bras. */
  acromion: Point3Mm;
  /** Creux de l'aisselle : haut du creux entre le bras et le tronc. */
  armpit: Point3Mm;
  /** Côté du tronc au niveau de la crête iliaque (hanches hautes). */
  iliacCrest: Point3Mm;
}

export interface BodyLandmarksMm {
  left: SideLandmarksMm;
  right: SideLandmarksMm;
}

const toMm = (p: readonly number[]): Point3Mm => [
  (p[0] as number) * 10,
  (p[1] as number) * 10,
  (p[2] as number) * 10,
];

const sideMm = (s: SideLandmarksCm): SideLandmarksMm => ({
  neckShoulderPoint: toMm(s.neckShoulder),
  acromion: toMm(s.acromion),
  armpit: toMm(s.armpit),
  iliacCrest: toMm(s.iliacCrest),
});

export const toBodyLandmarksMm = (reading: BodyReading): BodyLandmarksMm => ({
  left: sideMm(reading.left),
  right: sideMm(reading.right),
});

/** Entier dans les bornes du contrat. */
function bounded(key: DerivedKey, value: number): number {
  const [min, max] = DERIVED_BOUNDS[key];
  return Math.min(max, Math.max(min, Math.round(value)));
}

/** Les onze mesures en entiers dans les bornes du contrat (cm → mm ; la pente reste en degrés). */
export function toDerivedMeasurements(cm: DerivedCm): DerivedMeasurements {
  const raw: Record<DerivedKey, number> = {
    highBustGirthMm: cm.highBustGirth * 10,
    upperHipGirthMm: cm.upperHipGirth * 10,
    waistGirthBackMm: cm.waistGirthBack * 10,
    hipGirthBackMm: cm.hipGirthBack * 10,
    shoulderSlopeDeg: cm.shoulderSlopeDeg,
    waistToArmpitMm: cm.waistToArmpit * 10,
    waistToUpperHipMm: cm.waistToUpperHip * 10,
    crotchLengthMm: cm.crotchLength * 10,
    frontCrotchLengthMm: cm.frontCrotchLength * 10,
    waistToThighMm: cm.waistToThigh * 10,
    kneeHeightMm: cm.kneeHeight * 10,
  };
  return Object.fromEntries(
    DERIVED_KEYS.map((key) => [key, bounded(key, raw[key])]),
  ) as DerivedMeasurements;
}

/**
 * Le jeu de mesures fourni, complété des mesures lues pour celles qui lui manquent. Une mesure fournie n'est jamais
 * remplacée. Pur : `completeMeasurements` (`reading.ts`) y ajoute la lecture du corps.
 */
export function fillMissing(
  provided: MeasurementSet,
  derived: DerivedMeasurements,
): MeasurementSet {
  const completed: MeasurementSet = { ...provided };
  for (const key of DERIVED_KEYS) {
    if (completed[key] === undefined) completed[key] = derived[key];
  }
  return completed;
}

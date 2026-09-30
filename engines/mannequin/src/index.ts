import type { MeasurementSet } from '@atelier/contracts-ts';
import { mmToCm } from '@atelier/kernel';
import {
  createMakeHuman,
  type MakeHuman,
  type MakeHumanMeasuresCm,
  type Measured,
} from './core/makehuman.js';
import { plainFace } from './core/plain-face.js';

export type Morphotype = { african: number; asian: number; caucasian: number };

export interface FitOptions {
  age?: number;
  morphotype?: Morphotype;
  /** Bras abaissés, en degrés (pose de mannequin de vitrine). */
  armAngleDeg?: number;
}

/** Corps ajusté, prêt à afficher (cm) : tête naturelle, visage sans traits (yeux, nez, bouche). */
export interface FittedMannequin {
  /** Tableaux neufs à chaque `fit`, propriété de l'appelant (peuvent être transférés à un Worker). */
  body: { positions: Float32Array; normals: Float32Array; index: Uint32Array | Uint16Array };
  /** Tours obtenus sur le maillage, en mm, pour comparer aux mesures demandées. */
  measuredMm: Partial<Record<keyof MakeHumanMeasuresCm, number>>;
  /** Repères de hauteur du corps ajusté, en mm depuis le sol. */
  landmarksMm: LandmarksMm;
}

/**
 * Hauteurs depuis le sol (mm), mesurées sur le maillage ajusté : `crotch` entrejambe, `hip` bassin,
 * `waist` taille, `neck` cou, `knee` genou, `ankle` cheville (centres des zones de mesure).
 */
export interface LandmarksMm {
  crotch: number;
  hip: number;
  waist: number;
  neck: number;
  knee: number;
  ankle: number;
}

const toCm = (mm: number | undefined): number | undefined =>
  mm === undefined ? undefined : mmToCm(mm);

export function toMakeHumanMeasures(m: MeasurementSet): MakeHumanMeasuresCm {
  const cm: MakeHumanMeasuresCm = {
    stature: mmToCm(m.statureMm),
    chest: mmToCm(m.chestGirthMm),
    waist: mmToCm(m.waistGirthMm),
    hip: mmToCm(m.hipGirthMm),
    crotch: toCm(m.crotchHeightMm),
    neck: toCm(m.neckGirthMm),
    bicep: toCm(m.upperArmGirthMm),
    wrist: toCm(m.wristGirthMm),
    thigh: toCm(m.thighGirthMm),
    knee: toCm(m.kneeGirthMm),
    calf: toCm(m.calfGirthMm),
    ankle: toCm(m.ankleGirthMm),
  };
  return Object.fromEntries(
    Object.entries(cm).filter(([, v]) => v !== undefined),
  ) as MakeHumanMeasuresCm;
}

export interface MannequinEngine {
  fit(measurements: MeasurementSet, options?: FitOptions): FittedMannequin;
}

/** Repères de hauteur (mm) d'un corps mesuré (cm) ; une zone absente est une erreur, jamais 0. */
function landmarksOf(measured: Measured): LandmarksMm {
  const ringMm = (k: string): number => {
    const ring = measured.rings[k];
    if (!ring) throw new Error(`Repère de hauteur introuvable : zone de mesure ${k} absente`);
    return ring.center[1] * 10;
  };
  const crotchCm = measured['crotch'];
  if (crotchCm === undefined) throw new Error('Repère de hauteur introuvable : crotch');
  return {
    crotch: crotchCm * 10,
    hip: ringMm('hip'),
    waist: ringMm('waist'),
    neck: ringMm('neck'),
    knee: ringMm('knee'),
    ankle: ringMm('ankle'),
  };
}

/** Charge les données MakeHuman (gzip) une fois, puis ajuste autant de corps qu'on veut. */
export async function loadMannequinEngine(
  loadBytes: () => Promise<Uint8Array>,
): Promise<MannequinEngine> {
  const mh: MakeHuman = createMakeHuman(loadBytes);
  await mh.load();
  return {
    fit(measurements, options = {}) {
      const morpho = options.morphotype ?? { african: 1, asian: 0, caucasian: 0 };
      const sex = measurements.sex === 'female' ? 'femme' : 'homme';
      const fit = mh.fit(toMakeHumanMeasures(measurements), {
        sex,
        age: options.age ?? 30,
        ...morpho,
      });
      const neckY = fit.measured.rings['neck']?.center[1] ?? 0;
      const face = plainFace(fit.pos, mh.baseTriangles(), neckY);
      const posed = mh.pose(face.pos, options.armAngleDeg ?? 9);
      const body = mh.renderGeometry(posed.pos, face.drop);
      const measuredMm = Object.fromEntries(
        mh.FIT_KEYS.filter((k) => typeof fit.measured[k] === 'number').map((k) => [
          k,
          (fit.measured[k] ?? 0) * 10,
        ]),
      );
      const landmarksMm = landmarksOf(fit.measured);
      return { body, measuredMm, landmarksMm };
    },
  };
}

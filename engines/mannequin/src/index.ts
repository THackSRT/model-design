import type { MeasurementSet } from '@atelier/contracts-ts';
import { mmToCm } from '@atelier/kernel';
import { createMakeHuman, type MakeHuman, type MakeHumanMeasuresCm } from './core/makehuman.js';
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
  body: { positions: Float32Array; normals: Float32Array; index: Uint32Array | Uint16Array };
  /** Tours obtenus sur le maillage, en mm, pour comparer aux mesures demandées. */
  measuredMm: Partial<Record<keyof MakeHumanMeasuresCm, number>>;
}

const toCm = (mm: number | undefined): number | undefined =>
  mm === undefined ? undefined : mmToCm(mm);

export function toMakeHumanMeasures(m: MeasurementSet): MakeHumanMeasuresCm {
  const cm: MakeHumanMeasuresCm = {
    stature: mmToCm(m.statureMm),
    chest: mmToCm(m.chestGirthMm),
    waist: mmToCm(m.waistGirthMm),
    hip: mmToCm(m.hipGirthMm),
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
      return { body, measuredMm };
    },
  };
}

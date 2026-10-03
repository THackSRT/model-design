import { ENGINE_VERSION } from '@atelier/drape';
import type { CusickRun } from '../src/fabric-bench/cusick-runner.js';
import type { BenchDraft } from '../src/fabric-bench/measurement-draft.js';

/** Essais d'un popeline de coton conforme à l'estimation (tous dans la tolérance). */
export const poplinDraft: BenchDraft = {
  'weighing.sampleMassG': 1.2,
  'weighing.sampleAreaMm2': 10_000,
  'thickness.readingsMm.0': 0.2,
  'thickness.readingsMm.1': 0.21,
  'stretchWarp.stripWidthMm': 50,
  'stretchWarp.gaugeLengthMm': 200,
  'stretchWarp.loadedLengthMm': 204,
  'stretchWarp.hangingMassG': 1000,
  'bendingWarp.overhangLengthsMm.0': 34,
  'bendingWarp.overhangLengthsMm.1': 34,
  'friction.slideAnglesDeg.0': 19,
  'friction.counterSurface': 'skin-substitute',
};

/** Un grammage de 200 g/m² : loin des 120 g/m² estimés du popeline. */
export const heavyWeighing: BenchDraft = {
  'weighing.sampleMassG': 2,
  'weighing.sampleAreaMm2': 10_000,
};

export const cusickRun = (drapeCoefficient = 0.5): CusickRun => ({
  drapeCoefficient,
  converged: true,
  simulatedSteps: 120,
  outlineMm: new Float64Array(0),
  engineVersion: ENGINE_VERSION,
});

export const FIXED_NOW = new Date('2026-10-02T10:00:00.000Z');

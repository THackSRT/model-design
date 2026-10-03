import { beforeAll, describe, expect, it } from 'vitest';
import { InvalidInputError } from '../src/core/validate.js';
import type { SimulationResult } from '../src/core/types.js';
import { problemAfter } from '../src/drape/drape-garment.js';
import { problemOf } from '../src/drape/problems.js';
import { DrapeTooLargeError } from '../src/mesh/limits.js';
import { PlacementError } from '../src/placement/types.js';
import { drapeGarment, loadAvatarEngine } from '../src/node.js';
import { MAX_STEPS_LIMIT, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { fixture, jobOf } from './drape-helpers.js';

const sim = (over: Partial<SimulationResult>): SimulationResult => ({
  positionsMm: new Float64Array(0),
  steps: 1,
  converged: true,
  maxStitchGapMm: 0,
  maxPenetrationMm: 0,
  ...over,
});

describe('problemOf', () => {
  it('traduit les erreurs attendues', () => {
    expect(problemOf(new DrapeTooLargeError('trop grand'))).toEqual({ type: 'drape-too-large' });
    expect(problemOf(new InvalidInputError('mesh', 'maillage refusé'))).toEqual({
      type: 'invalid-input',
    });
    expect(problemOf(new PlacementError('placement-missing', 'front', 'x'))).toEqual({
      type: 'placement-missing',
      panelId: 'front',
    });
  });

  it('laisse passer les bogues', () => {
    expect(problemOf(new InvalidInputError('settings', 'réglage'))).toBeUndefined();
    expect(problemOf(new Error('autre'))).toBeUndefined();
  });
});

describe('problemAfter', () => {
  it('ne signale rien dans les tolérances', () => {
    const ok = sim({
      maxStitchGapMm: SEAM_TOLERANCE_MM,
      maxPenetrationMm: PENETRATION_TOLERANCE_MM,
    });
    expect(problemAfter(ok)).toBeUndefined();
  });

  it('seam-not-closed au-delà de la tolérance de couture', () => {
    expect(problemAfter(sim({ maxStitchGapMm: SEAM_TOLERANCE_MM + 0.1 }))).toEqual({
      type: 'seam-not-closed',
    });
  });

  it('body-penetration au-delà de la tolérance de pénétration', () => {
    expect(problemAfter(sim({ maxPenetrationMm: PENETRATION_TOLERANCE_MM + 0.1 }))).toEqual({
      type: 'body-penetration',
    });
  });
});

describe('borne dure du nombre de pas', () => {
  beforeAll(async () => {
    await loadAvatarEngine();
  });

  it('un maxSteps démesuré est ramené à MAX_STEPS_LIMIT', () => {
    const out = drapeGarment(jobOf(fixture('straight-skirt')), { maxSteps: 5000 });
    const steps = out.ok ? out.result.simulatedSteps : Infinity;
    expect(steps).toBeLessThanOrEqual(MAX_STEPS_LIMIT);
  });
});

import type { GarmentRequest, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { fixedClock, type Id, type IdGenerator } from '@atelier/kernel';
import type { Design, DesignId, OrganizationId } from '../src/domain/design.js';

export const ORG = '01920000-0000-7000-8000-000000000001' as OrganizationId;
export const OTHER_ORG = '01920000-0000-7000-8000-000000000002' as OrganizationId;
export const NOW = '2026-09-30T10:00:00.000Z';
export const clock = fixedClock(NOW);

/** Générateur d'identifiants prévisible : 0192…0001, 0192…0002, … */
export function sequentialIds(): IdGenerator {
  let n = 0;
  return {
    next: <E extends string>() =>
      `01920000-0000-7000-8000-${String(++n).padStart(12, '0')}` as Id<E>,
  };
}

export const someMeasurements = (): MeasurementSet => ({
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 700,
  hipGirthMm: 960,
});

export const aSkirt = (lengthMm = 600): GarmentRequest => ({
  type: 'straight-skirt',
  params: { lengthMm },
});

export const aSpec = (type = 'straight-skirt'): GarmentSpec => ({
  specVersion: '1.0',
  unit: 'mm',
  engine: { name: 'patterning', version: '0.1.0' },
  garment: { type },
  panels: [
    {
      id: 'front',
      name: 'Devant',
      quantity: 1,
      edges: [
        { id: 'a', from: [0, 0], to: [100, 0] },
        { id: 'b', from: [100, 0], to: [0, 100] },
        { id: 'c', from: [0, 100], to: [0, 0] },
      ],
    },
  ],
  seams: [],
});

export const aDesign = (overrides: Partial<Design> = {}): Design => ({
  id: '01920000-0000-7000-8000-00000000d001' as DesignId,
  organizationId: ORG,
  name: 'Jupe droite',
  garmentType: 'straight-skirt',
  createdAt: new Date(NOW),
  latestVersionNumber: 0,
  ...overrides,
});

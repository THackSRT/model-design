import { readFileSync } from 'node:fs';
import type { DrapeJob, GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';

// Aides des tests de drapé sur l'avatar. Mesures fictives (jamais réelles) : celles des références du patronage.

export const fixture = (name: string): GarmentSpec =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

export const MEASUREMENTS: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 640,
  hipGirthMm: 960,
  crotchHeightMm: 770,
};

export function jobOf(spec: GarmentSpec, over: Partial<DrapeJob> = {}): DrapeJob {
  return {
    drapeId: '00000000-0000-4000-8000-000000000001',
    organizationId: '00000000-0000-4000-8000-000000000002',
    designId: '00000000-0000-4000-8000-000000000003',
    versionNumber: 1,
    spec,
    measurements: { ...MEASUREMENTS },
    avatar: {},
    fabric: { preset: 'cotton-poplin' },
    quality: 'draft',
    ...over,
  };
}

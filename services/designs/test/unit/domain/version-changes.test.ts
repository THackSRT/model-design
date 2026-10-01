import { describe, expect, it } from 'vitest';
import { summaryOf } from '../../../src/domain/design-version.js';
import { compareVersions } from '../../../src/domain/version-changes.js';
import { aDesign, aSkirt, aSpec, NOW, someMeasurements } from '../../builders.js';
import type { DesignVersion } from '../../../src/domain/design-version.js';

const version = (overrides: Partial<DesignVersion> = {}): DesignVersion => ({
  designId: aDesign().id,
  number: 1,
  createdAt: new Date(NOW),
  measurements: someMeasurements(),
  garment: aSkirt(),
  fingerprint: 'a'.repeat(64),
  spec: aSpec(),
  ...overrides,
});

describe('comparaison de deux versions', () => {
  it('rend des listes vides et la même empreinte pour deux versions identiques', () => {
    expect(compareVersions(version(), version({ number: 2 }))).toEqual({
      sameFingerprint: true,
      params: [],
      measurements: [],
    });
  });

  it('liste les paramètres et mesures différents, triés', () => {
    const changed = version({
      number: 2,
      fingerprint: 'b'.repeat(64),
      garment: aSkirt(650),
      measurements: { ...someMeasurements(), waistGirthMm: 720, chestGirthMm: 900 },
    });
    expect(compareVersions(version(), changed)).toEqual({
      sameFingerprint: false,
      params: [{ path: 'lengthMm', from: 600, to: 650 }],
      measurements: [
        { name: 'chestGirthMm', from: 880, to: 900 },
        { name: 'waistGirthMm', from: 700, to: 720 },
      ],
    });
  });

  it('signale l’apparition et la disparition de paramètres imbriqués (sleeve.*)', () => {
    const bodice = (params: object): DesignVersion['garment'] =>
      ({ type: 'bodice', params }) as DesignVersion['garment'];
    const without = version({ garment: bodice({ ease: 4 }) });
    const withSleeve = version({
      garment: bodice({ ease: 4, sleeve: { capEaseMm: 30, lengthMm: 600 } }),
    });
    expect(compareVersions(without, withSleeve).params).toEqual([
      { path: 'sleeve.capEaseMm', to: 30 },
      { path: 'sleeve.lengthMm', to: 600 },
    ]);
    expect(compareVersions(withSleeve, without).params).toEqual([
      { path: 'sleeve.capEaseMm', from: 30 },
      { path: 'sleeve.lengthMm', from: 600 },
    ]);
  });

  it('signale une mesure apparue ou disparue', () => {
    const withNeck = version({ measurements: { ...someMeasurements(), neckGirthMm: 360 } });
    expect(compareVersions(version(), withNeck).measurements).toEqual([
      { name: 'neckGirthMm', to: 360 },
    ]);
    expect(compareVersions(withNeck, version()).measurements).toEqual([
      { name: 'neckGirthMm', from: 360 },
    ]);
  });
});

describe('résumé de version', () => {
  it('ne contient ni mesures ni patron', () => {
    const summary = summaryOf(version());
    expect(Object.keys(summary).sort()).toEqual([
      'createdAt',
      'engineVersion',
      'fingerprint',
      'garment',
      'number',
    ]);
    expect(summary.engineVersion).toBe('0.1.0');
  });
});

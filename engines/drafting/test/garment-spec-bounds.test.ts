import { describe, expect, it } from 'vitest';
import {
  FreeSewingError,
  SeamError,
  describeModel,
  draftModel,
  toGarmentSpec,
} from '../src/index.js';
import type { DraftOptions, OptionSpec } from '../src/index.js';
import { VALIDATION_SIZES, mulberry32, sizeRequest } from './helpers.js';
import { schemaErrors, structureProblems } from './spec-helpers.js';

/**
 * Une GarmentSpec valide, ou le rejet typé que la fiche prévoit : `s3Collar` déplace la couture d'épaule du devant et
 * celle du dos de façon différente, et au-delà de ± 2 mm d'écart (de − 0,8 à − 1 et à + 1 pour les grandes tailles,
 * mesuré sur 20 tailles) le tracé est refusé, comme tout écart non déclaré. Rend `true` si la spécification est valide,
 * `false` si elle est refusée ainsi.
 */
function validOrRejected(request: Parameters<typeof draftModel>[0]): boolean {
  const draft = draftModel(request);
  try {
    const spec = toGarmentSpec(draft);
    expect(schemaErrors(spec)).toEqual([]);
    expect(structureProblems(spec)).toEqual([]);
    return true;
  } catch (error) {
    if (!(error instanceof SeamError) || error.seam !== 'shoulder') throw error;
    expect(request.options && 's3Collar' in request.options).toBe(true);
    return false;
  }
}

describe('GarmentSpec de Brian aux bornes des options', () => {
  const { options } = describeModel('brian');
  const valuesOf = (option: OptionSpec): (number | boolean | string)[] =>
    option.kind === 'number'
      ? [option.min, option.max]
      : option.kind === 'boolean'
        ? [true, false]
        : [...option.values];

  /** Une demande par borne de chaque option et par taille de validation. */
  const boundRequests = VALIDATION_SIZES.flatMap((size) =>
    options.flatMap((option) =>
      valuesOf(option).map((value) => sizeRequest(size, { [option.name]: value })),
    ),
  );

  it('est valide à chaque borne de chaque option sur les cinq tailles, sauf les épaules écartées par s3Collar', () => {
    const outcomes = boundRequests.map((request) => validOrRejected(request));
    const rejected = outcomes.filter((ok) => !ok).length;
    expect(outcomes.length - rejected).toBeGreaterThan(350);
    // Seule s3Collar refuse un tracé : à sa borne basse sur les cinq tailles, à la haute sur trois (mesuré : 8 sur 370).
    expect(rejected).toBeLessThanOrEqual(10);
  });

  it('est valide quand lengthBonus raccourcit le dos sous la ligne des hanches : le milieu dos redevient une seule droite', () => {
    for (const lengthBonus of [-0.04, -0.03, -0.001, 0, 0.0004, 0.01, 0.6]) {
      for (const size of VALIDATION_SIZES) {
        expect(validOrRejected(sizeRequest(size, { lengthBonus })), `${size} ${lengthBonus}`).toBe(
          true,
        );
      }
    }
  });

  it('est valide au bord des fenêtres étroites où FreeSewing fusionne des points voisins (lengthBonus presque nul)', () => {
    for (const lengthBonus of [-0.0009, -0.0004, -0.0001, 0.0001, 0.0007, 0.0009, 0.0012]) {
      for (const size of VALIDATION_SIZES) {
        expect(validOrRejected(sizeRequest(size, { lengthBonus }))).toBe(true);
      }
    }
  });

  it('déclare l’embu sur toute la plage de sleevecapEase, sans paire au-delà des 50 mm du contrat', () => {
    for (const sleevecapEase of [0, 0.001, 0.01, 0.03, 0.05, 0.08, 0.1]) {
      for (const size of VALIDATION_SIZES) {
        const spec = toGarmentSpec(draftModel(sizeRequest(size, { sleevecapEase })));
        expect(schemaErrors(spec)).toEqual([]);
        for (const seam of spec.seams) expect(seam.easeMm ?? 0).toBeLessThanOrEqual(50);
      }
    }
  });
});

describe('GarmentSpec de Brian : options tirées au hasard dans leurs bornes', () => {
  const { options: specs } = describeModel('brian');

  function randomValue(spec: OptionSpec, random: () => number): number | boolean | string {
    if (spec.kind === 'boolean') return random() < 0.5;
    if (spec.kind === 'choice')
      return spec.values[Math.floor(random() * spec.values.length)] as string;
    const value = spec.min + random() * (spec.max - spec.min);
    return spec.integer ? Math.round(value) : value;
  }

  it('donne une spécification valide, ou le rejet typé de l’épaule, ou l’erreur de FreeSewing de 1.55a (jamais une fiche en défaut)', () => {
    const random = mulberry32(99);
    const runs = 300;
    let refused = 0;
    for (let i = 0; i < runs; i++) {
      const options: DraftOptions = Object.fromEntries(
        specs.flatMap((spec) =>
          random() < 0.5 ? [[spec.name, randomValue(spec, random)] as const] : [],
        ),
      );
      const size = VALIDATION_SIZES[
        i % VALIDATION_SIZES.length
      ] as (typeof VALIDATION_SIZES)[number];
      try {
        if (!validOrRejected({ model: 'brian', measurements: { size }, options })) refused++;
      } catch (error) {
        if (!(error instanceof FreeSewingError)) throw error;
        refused++;
      }
    }
    // Une fois sur vingt environ s3Collar tombe dans sa moitié basse, au-delà de − 0,8.
    expect(refused).toBeLessThanOrEqual(runs * 0.12);
  });
});

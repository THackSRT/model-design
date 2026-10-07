import { describe, expect, it } from 'vitest';
import { sizeMeasurements } from '../src/adapters/freesewing/sizes.js';
import { draftModel, toGarmentSpec } from '../src/index.js';
import type { DraftRequest, PointMm } from '../src/index.js';
import * as nodeEntry from '../src/node.js';
import {
  BASE_OPTION_SETS,
  VALIDATION_SIZES,
  measurementSetOf,
  sexOf,
  sizeRequest,
} from './helpers.js';

/** Fige un objet et tout ce qu'il contient : un moteur qui le modifierait lèverait une exception. */
function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null) {
    for (const inner of Object.values(value)) deepFreeze(inner);
    Object.freeze(value);
  }
  return value;
}

describe('déterminisme', () => {
  it('deux tracés identiques donnent la même sortie, octet pour octet', () => {
    for (const size of VALIDATION_SIZES) {
      for (const options of BASE_OPTION_SETS) {
        const first = draftModel(sizeRequest(size, options));
        const second = draftModel(sizeRequest(size, options));
        expect(second).toEqual(first);
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      }
    }
  });

  it('ne garde aucun état d’un tracé à l’autre : A, B puis A rend deux fois A', () => {
    const a = sizeRequest('cisFemaleAdult34', { lengthBonus: 0.3, chestEase: 0.2 });
    const b = sizeRequest('cisMaleAdult42', { s3Collar: 0.5, bicepsEase: 0.4 });
    const before = JSON.stringify(draftModel(a));
    draftModel(b);
    draftModel(sizeRequest('cisFemaleAdult46'));
    expect(JSON.stringify(draftModel(a))).toBe(before);
  });

  it('rend la même sortie par l’entrée node et par l’entrée .', () => {
    const request = sizeRequest('cisMaleAdult42', { chestEase: 0.12 });
    expect(JSON.stringify(nodeEntry.draftModel(request))).toBe(JSON.stringify(draftModel(request)));
  });

  it('ne modifie pas ses entrées : taille, jeu de mesures et options gelés sont acceptés', () => {
    const set = measurementSetOf('male', sizeMeasurements('cisMaleAdult42'));
    const frozen = deepFreeze<DraftRequest>({
      model: 'brian',
      measurements: { set },
      options: { chestEase: 0.12, lengthBonus: 0.28, draftForHighBust: false },
    });
    const copy = JSON.stringify(frozen);
    const result = draftModel(frozen);
    expect(JSON.stringify(frozen)).toBe(copy);
    expect(result.parts).toHaveLength(3);
    expect(JSON.stringify(draftModel(frozen))).toBe(JSON.stringify(result));
  });

  it('ne partage rien avec le paquet des tailles : modifier une taille ou un résultat ne change pas le tracé suivant', () => {
    const request = sizeRequest('cisFemaleAdult40');
    const baseline = JSON.stringify(draftModel(request));
    const table = sizeMeasurements('cisFemaleAdult40') as Record<string, number>;
    table.chest = 99999;
    const result = draftModel(request);
    (result.parts[0]?.points as Record<string, PointMm>).cfNeck = { xMm: 1, yMm: 1 };
    expect(JSON.stringify(draftModel(request))).toBe(baseline);
    expect(sizeMeasurements('cisFemaleAdult40').chest).not.toBe(99999);
  });

  it('un jeu de mesures équivalent à la taille rend la même sortie pour chaque taille de validation', () => {
    for (const size of VALIDATION_SIZES) {
      const set = measurementSetOf(sexOf(size), sizeMeasurements(size));
      expect(draftModel({ model: 'brian', measurements: { set } })).toEqual(
        draftModel(sizeRequest(size)),
      );
    }
  });
});

describe('déterminisme de la GarmentSpec', () => {
  it('deux conversions du même tracé donnent la même spécification, octet pour octet', () => {
    for (const size of VALIDATION_SIZES) {
      for (const options of BASE_OPTION_SETS) {
        const first = toGarmentSpec(draftModel(sizeRequest(size, options)));
        const second = toGarmentSpec(draftModel(sizeRequest(size, options)));
        expect(JSON.stringify(second)).toBe(JSON.stringify(first));
      }
    }
  });

  it('ne modifie pas le tracé qu’elle convertit : un tracé gelé est accepté et reste le même', () => {
    const draft = deepFreeze(draftModel(sizeRequest('cisMaleAdult42', { chestEase: 0.12 })));
    const copy = JSON.stringify(draft);
    const spec = toGarmentSpec(draft);
    expect(JSON.stringify(draft)).toBe(copy);
    expect(JSON.stringify(toGarmentSpec(draft))).toBe(JSON.stringify(spec));
  });

  it('ne garde aucun état d’une conversion à l’autre : A, B puis A rend deux fois A', () => {
    const a = draftModel(
      sizeRequest('cisFemaleAdult34', { lengthBonus: 0.3, sleevecapEase: 0.05 }),
    );
    const b = draftModel(sizeRequest('cisMaleAdult42', { bicepsEase: 0.4 }));
    const before = JSON.stringify(toGarmentSpec(a));
    toGarmentSpec(b);
    expect(JSON.stringify(toGarmentSpec(a))).toBe(before);
  });

  it('rend la même spécification par l’entrée node et par l’entrée .', () => {
    const draft = draftModel(sizeRequest('cisMaleAdult42'));
    expect(JSON.stringify(nodeEntry.toGarmentSpec(draft))).toBe(
      JSON.stringify(toGarmentSpec(draft)),
    );
  });

  it('un jeu de mesures équivalent à la taille rend la même spécification', () => {
    const set = measurementSetOf('male', sizeMeasurements('cisMaleAdult42'));
    const fromSet = toGarmentSpec(draftModel({ model: 'brian', measurements: { set } }));
    expect(fromSet).toEqual(toGarmentSpec(draftModel(sizeRequest('cisMaleAdult42'))));
  });
});

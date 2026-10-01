import { jsonSchemas } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  DRAFTED_GARMENT_TYPES,
  GARMENT_TYPES,
  garmentFields,
  initialParams,
  isDraftedGarmentType,
  sleeveFields,
} from '../src/pattern-studio/garment-fields.js';

const defs = jsonSchemas.garmentRequest.$defs;

describe('champs du formulaire par type de vêtement', () => {
  it('liste les types du contrat ; un type inconnu n’est pas tracé', () => {
    expect(GARMENT_TYPES).toEqual(jsonSchemas.garmentType.enum);
    expect(isDraftedGarmentType('coat')).toBe(false);
    expect(isDraftedGarmentType('bodice')).toBe(true);
    expect(DRAFTED_GARMENT_TYPES.every((type) => GARMENT_TYPES.includes(type))).toBe(true);
  });

  it('jupe droite : bornes et défauts exacts du contrat', () => {
    const { properties } = defs.StraightSkirtParams;
    expect(garmentFields('straight-skirt')).toEqual([
      { param: 'lengthMm', unit: 'cm', ...pick(properties.lengthMm), required: true },
      { param: 'waistEaseMm', unit: 'cm', ...pick(properties.waistEaseMm), required: false },
      { param: 'hipEaseMm', unit: 'cm', ...pick(properties.hipEaseMm), required: false },
      { param: 'hemFlareMm', unit: 'cm', ...pick(properties.hemFlareMm), required: false },
    ]);
  });

  it('jupe cercle : fraction sans unité, ceinture à 0 ou dans la plage du anyOf', () => {
    const { properties } = defs.CircleSkirtParams;
    const fields = garmentFields('circle-skirt');
    expect(fields.find((f) => f.param === 'circleFraction')).toEqual({
      param: 'circleFraction',
      unit: 'ratio',
      ...pick(properties.circleFraction),
      required: false,
    });
    const band = properties.waistbandWidthMm.anyOf[1];
    expect(fields.find((f) => f.param === 'waistbandWidthMm')).toEqual({
      param: 'waistbandWidthMm',
      unit: 'cm',
      minimum: band.minimum,
      maximum: band.maximum,
      default: properties.waistbandWidthMm.default,
      required: false,
      zeroAllowed: true,
    });
  });

  it('pantalon : le bas de jambe est facultatif et sans défaut', () => {
    const { properties } = defs.TrousersParams;
    const hem = garmentFields('trousers').find((f) => f.param === 'hemGirthMm');
    expect(hem).toEqual({
      param: 'hemGirthMm',
      unit: 'cm',
      minimum: properties.hemGirthMm.minimum,
      maximum: properties.hemGirthMm.maximum,
      required: false,
      zeroAllowed: false,
    });
  });

  it('saisie de départ : défauts du contrat convertis en cm, longueur d’exemple', () => {
    expect(initialParams('straight-skirt')).toEqual({
      lengthMm: 60,
      waistEaseMm: 1,
      hipEaseMm: 4,
      hemFlareMm: 0,
    });
    expect(initialParams('circle-skirt').circleFraction).toBe(1);
    expect(initialParams('trousers').hemGirthMm).toBeUndefined();
  });
});

describe('corsage', () => {
  it('champs du corsage sans le sous-objet manches', () => {
    const names = garmentFields('bodice').map((f) => f.param);
    expect(names).toEqual(Object.keys(defs.BodiceParams.properties).filter((n) => n !== 'sleeve'));
    expect(garmentFields('bodice').every((f) => !f.required)).toBe(true);
  });

  it('manches : bornes du contrat, longueur obligatoire, bas de manche facultatif', () => {
    const { properties } = defs.SleeveParams;
    expect(sleeveFields()).toEqual([
      { param: 'lengthMm', unit: 'cm', ...pick(properties.lengthMm), required: true },
      { param: 'capEaseMm', unit: 'cm', ...pick(properties.capEaseMm), required: false },
      { param: 'hemGirthMm', unit: 'cm', ...pick(properties.hemGirthMm), required: false },
    ]);
  });
});

function pick(property: { minimum: number; maximum: number; default?: number }) {
  return {
    minimum: property.minimum,
    maximum: property.maximum,
    ...('default' in property ? { default: property.default } : {}),
    zeroAllowed: false,
  };
}

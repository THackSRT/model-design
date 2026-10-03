import { garmentRequestJsonSchema, measurementSetJsonSchema } from '@atelier/contracts-ts';

/** Noms de toutes les propriétés de `MeasurementSet`, lus dans le contrat (pour vérifier la couverture des libellés). */
export const MEASUREMENT_SET_KEYS: readonly string[] = Object.keys(
  measurementSetJsonSchema.properties,
);

const defs = garmentRequestJsonSchema.$defs;
const keysOf = (schema: { properties: Record<string, unknown> }): string[] =>
  Object.keys(schema.properties).filter((key) => key !== 'sleeve');

/** Paramètres de chaque type de vêtement du contrat (et `sleeve`, ses manches), lus dans le contrat. */
export const GARMENT_PARAM_KEYS: Readonly<Record<string, readonly string[]>> = {
  'straight-skirt': keysOf(defs.StraightSkirtParams),
  'circle-skirt': keysOf(defs.CircleSkirtParams),
  trousers: keysOf(defs.TrousersParams),
  bodice: keysOf(defs.BodiceParams),
  sleeve: keysOf(defs.SleeveParams),
};

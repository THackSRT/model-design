import {
  garmentRequestJsonSchema,
  garmentTypeJsonSchema,
  type GarmentType,
} from '@atelier/contracts-ts';

/** Types de vêtement du contrat, dans l'ordre du contrat. */
export const GARMENT_TYPES: readonly GarmentType[] = garmentTypeJsonSchema.enum;

/** Types dont le patron est tracé aujourd'hui ; les autres restent visibles mais désactivés. */
export const DRAFTED_GARMENT_TYPES = [
  'straight-skirt',
  'circle-skirt',
  'trousers',
  'bodice',
] as const;
export type DraftedGarmentType = (typeof DRAFTED_GARMENT_TYPES)[number];

export const isDraftedGarmentType = (type: string): type is DraftedGarmentType =>
  (DRAFTED_GARMENT_TYPES as readonly string[]).includes(type);

/** Un champ du formulaire d'un type, décrit par le contrat (bornes en mm pour une longueur). */
export interface GarmentField {
  param: string;
  /** `cm` : longueur saisie en cm, envoyée en mm ; `ratio` : nombre sans unité. */
  unit: 'cm' | 'ratio';
  minimum: number;
  maximum: number;
  /** Valeur par défaut du contrat (mm pour une longueur) ; absente : le champ n'a pas de défaut. */
  default?: number;
  required: boolean;
  /** Vrai quand la valeur peut aussi être 0 en dehors de [minimum, maximum] (anyOf du contrat). */
  zeroAllowed: boolean;
}

interface Branch {
  type?: string;
  $ref?: string;
  const?: number;
  minimum?: number;
  maximum?: number;
}
interface RawProperty extends Branch {
  default?: number;
  anyOf?: readonly Branch[];
}
interface ParamsSchema {
  required?: readonly string[];
  properties: Record<string, RawProperty>;
}

const defs = garmentRequestJsonSchema.$defs;
const SCHEMAS: Record<DraftedGarmentType, ParamsSchema> = {
  'straight-skirt': defs.StraightSkirtParams,
  'circle-skirt': defs.CircleSkirtParams,
  trousers: defs.TrousersParams,
  bodice: defs.BodiceParams,
};
const SLEEVE_SCHEMA: ParamsSchema = defs.SleeveParams;

function toField(param: string, raw: RawProperty, required: boolean): GarmentField {
  const range = raw.anyOf?.find((branch) => branch.minimum !== undefined) ?? raw;
  return {
    param,
    unit: param.endsWith('Mm') ? 'cm' : 'ratio',
    minimum: range.minimum ?? 0,
    maximum: range.maximum ?? 0,
    ...(raw.default === undefined ? {} : { default: raw.default }),
    required,
    zeroAllowed: raw.anyOf?.some((branch) => branch.const === 0) ?? false,
  };
}

function fieldsOf(schema: ParamsSchema): GarmentField[] {
  return Object.entries(schema.properties)
    .filter(([, raw]) => raw.$ref === undefined) // les sous-objets ont leur propre schéma (manches)
    .map(([param, raw]) => toField(param, raw, schema.required?.includes(param) ?? false));
}

/** Champs du formulaire d'un type tracé, bornes et défauts lus dans le contrat (jamais recopiés). */
export const garmentFields = (type: DraftedGarmentType): GarmentField[] => fieldsOf(SCHEMAS[type]);

/** Champs facultatifs des manches du corsage (`$defs.SleeveParams`). */
export const sleeveFields = (): GarmentField[] => fieldsOf(SLEEVE_SCHEMA);

export type ParamValues = Record<string, number | undefined>;

/** Longueurs d'exemple (cm) : le contrat n'a pas de défaut pour une longueur obligatoire. */
const INITIAL_LENGTH_CM: Partial<Record<DraftedGarmentType | 'sleeve', number>> = {
  'straight-skirt': 60,
  'circle-skirt': 60,
  trousers: 100,
  sleeve: 60,
};

function initialValues(fields: GarmentField[], lengthCm: number | undefined): ParamValues {
  const values: ParamValues = {};
  for (const field of fields) {
    if (field.param === 'lengthMm') values[field.param] = lengthCm;
    else if (field.default !== undefined) {
      values[field.param] = field.unit === 'cm' ? field.default / 10 : field.default;
    }
  }
  return values;
}

/** Saisie de départ (cm ou ratio) : défauts du contrat, et une longueur d'exemple du type. */
export const initialParams = (type: DraftedGarmentType): ParamValues =>
  initialValues(garmentFields(type), INITIAL_LENGTH_CM[type]);

export const initialSleeve = (): ParamValues =>
  initialValues(sleeveFields(), INITIAL_LENGTH_CM.sleeve);

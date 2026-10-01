import { jsonSchemas, type GarmentType } from '@atelier/contracts-ts';

/** Types de vêtement du contrat, dans l'ordre du contrat. */
export const GARMENT_TYPES: readonly GarmentType[] = jsonSchemas.garmentType.enum;

/** Types dont le patron est tracé aujourd'hui ; les autres restent visibles mais désactivés. */
export const DRAFTED_GARMENT_TYPES = ['straight-skirt', 'circle-skirt', 'trousers'] as const;
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

const defs = jsonSchemas.garmentRequest.$defs;
const SCHEMAS: Record<DraftedGarmentType, ParamsSchema> = {
  'straight-skirt': defs.StraightSkirtParams,
  'circle-skirt': defs.CircleSkirtParams,
  trousers: defs.TrousersParams,
};

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

/** Champs du formulaire d'un type tracé, bornes et défauts lus dans le contrat (jamais recopiés). */
export function garmentFields(type: DraftedGarmentType): GarmentField[] {
  const schema = SCHEMAS[type];
  return Object.entries(schema.properties).map(([param, raw]) =>
    toField(param, raw, schema.required?.includes(param) ?? false),
  );
}

export type ParamValues = Record<string, number | undefined>;

const INITIAL_LENGTH_CM: Record<DraftedGarmentType, number> = {
  'straight-skirt': 60,
  'circle-skirt': 60,
  trousers: 100,
};

/** Saisie de départ (cm ou ratio) : défauts du contrat, et une longueur d'exemple du type. */
export function initialParams(type: DraftedGarmentType): ParamValues {
  const values: ParamValues = {};
  for (const field of garmentFields(type)) {
    if (field.param === 'lengthMm') values[field.param] = INITIAL_LENGTH_CM[type];
    else if (field.default !== undefined) {
      values[field.param] = field.unit === 'cm' ? field.default / 10 : field.default;
    }
  }
  return values;
}

import { fabricBenchMeasurementsJsonSchema } from '@atelier/contracts-ts';

/** Un essai d'atelier du contrat, dans l'ordre du contrat. */
export type BenchTestKey =
  | 'weighing'
  | 'thickness'
  | 'stretchWarp'
  | 'stretchWeft'
  | 'bendingWarp'
  | 'bendingWeft'
  | 'friction'
  | 'drape';

/**
 * Un champ de saisie d'un essai, décrit par le contrat (jamais recopié).
 * `number` : un nombre ; `series` : lectures indexées (`<chemin>.<i>`) ; `choice` : une valeur d'une liste ;
 * `fixed` : constante du contrat, jamais saisie.
 */
export interface BenchField {
  param: string;
  /** Chemin d'erreur et de brouillon : `<essai>.<champ>`. */
  path: string;
  kind: 'number' | 'series' | 'choice' | 'fixed';
  /** Bornes (de chaque lecture pour une série). */
  min?: number;
  max?: number;
  minExclusive?: boolean;
  maxItems?: number;
  options?: readonly string[];
  fixed?: number;
}

export interface BenchTest {
  key: BenchTestKey;
  fields: BenchField[];
}

interface RawField {
  type?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  maxItems?: number;
  enum?: readonly (string | number)[];
  items?: RawField;
}
interface RawDef {
  properties: Record<string, RawField>;
}

const schema = fabricBenchMeasurementsJsonSchema;
const defs = schema.$defs as unknown as Record<string, RawDef>;

function bounds(raw: RawField): Pick<BenchField, 'min' | 'max' | 'minExclusive'> {
  const exclusive = raw.exclusiveMinimum !== undefined;
  return {
    min: raw.minimum ?? raw.exclusiveMinimum ?? 0,
    max: raw.maximum ?? 0,
    ...(exclusive ? { minExclusive: true } : {}),
  };
}

function toField(test: BenchTestKey, param: string, raw: RawField): BenchField {
  const path = `${test}.${param}`;
  const base = { param, path };
  if (raw.type === 'array') {
    return {
      ...base,
      kind: 'series',
      ...bounds(raw.items ?? {}),
      maxItems: raw.maxItems ?? 1,
    };
  }
  const options = raw.enum;
  if (options && typeof options[0] === 'number')
    return { ...base, kind: 'fixed', fixed: options[0] };
  if (options) return { ...base, kind: 'choice', options: options.map(String) };
  return { ...base, kind: 'number', ...bounds(raw) };
}

/** Nom de la définition d'un essai : `#/$defs/<Nom>`. */
const defName = (ref: string): string => ref.slice(ref.lastIndexOf('/') + 1);

/** Les essais d'atelier et leurs champs, lus dans `fabricBenchMeasurements` ($defs). */
export const BENCH_TESTS: readonly BenchTest[] = Object.entries(schema.properties).map(
  ([key, { $ref }]) => ({
    key: key as BenchTestKey,
    fields: Object.entries(defs[defName($ref)]?.properties ?? {}).map(([param, raw]) =>
      toField(key as BenchTestKey, param, raw),
    ),
  }),
);

export const BENCH_TEST_KEYS: readonly BenchTestKey[] = BENCH_TESTS.map((t) => t.key);

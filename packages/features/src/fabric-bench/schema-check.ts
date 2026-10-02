import {
  fabricBenchMeasurementsJsonSchema,
  fabricDerivedValuesJsonSchema,
  fabricJsonSchema,
  fabricPhysicsJsonSchema,
  fabricPresetReviewJsonSchema,
  fabricValidationReportJsonSchema,
} from '@atelier/contracts-ts';

/**
 * Validateur minimal de JSON Schema, piloté par un registre local des six schémas `fabric-*` (ADR 0015 ;
 * l'objet agrégé `jsonSchemas` ramènerait tous les schémas du contrat dans le paquet d'entrée du studio). Pas d'Ajv : il génère du code par
 * `new Function`, incompatible avec une politique de sécurité de contenu stricte. Il couvre le sous-ensemble
 * utilisé par les schémas `fabric-*` ; un mot-clé inconnu est une erreur de développeur (`Error`).
 */
export interface SchemaViolation {
  /** Pointeur JSON de la valeur fautive ('' pour la racine). */
  path: string;
  /** Mot-clé du schéma qui échoue ('false' pour un schéma booléen faux). */
  keyword: string;
}

/** Schémas connus du validateur ; un `$ref` vers un autre fichier est une erreur de développeur. */
export const SCHEMA_REGISTRY = {
  fabric: fabricJsonSchema,
  fabricPhysics: fabricPhysicsJsonSchema,
  fabricBenchMeasurements: fabricBenchMeasurementsJsonSchema,
  fabricDerivedValues: fabricDerivedValuesJsonSchema,
  fabricPresetReview: fabricPresetReviewJsonSchema,
  fabricValidationReport: fabricValidationReportJsonSchema,
} as const;
export type SchemaKey = keyof typeof SCHEMA_REGISTRY;
interface Ctx {
  /** Clé de `SCHEMA_REGISTRY` du fichier en cours (cible des `$ref` locaux). */
  doc: string;
  path: string;
}
type Check = (
  value: unknown,
  arg: unknown,
  ctx: Ctx,
  schema: Record<string, unknown>,
) => SchemaViolation | undefined;

const ANNOTATIONS: ReadonlySet<string> = new Set([
  '$schema',
  '$id',
  '$defs',
  'title',
  'description',
  'examples',
  'default',
]);

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function isDateTime(text: string): boolean {
  const m = DATE_TIME.exec(text);
  if (!m || Number.isNaN(Date.parse(text))) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

const TYPE_TESTS: Record<string, (v: unknown) => boolean> = {
  object: isRecord,
  array: Array.isArray,
  string: (v) => typeof v === 'string',
  number: (v) => typeof v === 'number' && Number.isFinite(v),
  integer: (v) => typeof v === 'number' && Number.isInteger(v),
  boolean: (v) => typeof v === 'boolean',
};

/** enum et const : les valeurs attendues des schémas fabric-* sont primitives, comparées par `===` (une valeur non fiable n'est jamais sérialisée). */
function sameJson(expected: unknown, value: unknown): boolean {
  if (typeof expected === 'object' && expected !== null) {
    throw new Error('enum and const with an object value are not supported');
  }
  return expected === value;
}

const fail = (ctx: Ctx, keyword: string): SchemaViolation => ({ path: ctx.path, keyword });

/** Mot-clé de test simple : `ok(value, arg)` faux → violation. */
const simple =
  (keyword: string, ok: (v: unknown, arg: never) => boolean): Check =>
  (value, arg, ctx) =>
    ok(value, arg as never) ? undefined : fail(ctx, keyword);

const num = (v: unknown, test: (n: number) => boolean): boolean => typeof v !== 'number' || test(v);
const str = (v: unknown, test: (s: string) => boolean): boolean => typeof v !== 'string' || test(v);
const arr = (v: unknown, test: (a: unknown[]) => boolean): boolean => !Array.isArray(v) || test(v);
/** Longueur en points de code (JSON Schema), sans allouer de tableau. */
function length(s: string): number {
  let count = 0;
  for (let i = 0; i < s.length; i += 1) {
    const unit = s.charCodeAt(i);
    const isHighSurrogate = unit >= 0xd800 && unit <= 0xdbff;
    const next = isHighSurrogate ? s.charCodeAt(i + 1) : 0;
    if (next >= 0xdc00 && next <= 0xdfff) i += 1;
    count += 1;
  }
  return count;
}

const camel = (kebab: string): string =>
  kebab.replace(/-([a-z])/g, (_m, c: string) => c.toUpperCase());

function rootOf(doc: string): unknown {
  if (!Object.hasOwn(SCHEMA_REGISTRY, doc)) throw new Error(`Unknown schema file: ${doc}`);
  return (SCHEMA_REGISTRY as Record<string, unknown>)[doc];
}

/** Résout un `$ref` local (`#/...`) ou vers un autre fichier (`./x.schema.json[#/...]`). */
function resolveRef(ref: string, doc: string): { schema: unknown; doc: string } {
  const [file = '', pointer = ''] = ref.split('#');
  const target = file === '' ? doc : camel(/([^/]+)\.schema\.json$/.exec(file)?.[1] ?? file);
  let node = rootOf(target);
  for (const raw of pointer.split('/').slice(1)) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (!isRecord(node) || !Object.hasOwn(node, key)) throw new Error(`Unresolved $ref: ${ref}`);
    node = node[key];
  }
  return { schema: node, doc: target };
}

function checkProperties(value: unknown, props: unknown, ctx: Ctx): SchemaViolation | undefined {
  if (!isRecord(value) || !isRecord(props)) return undefined;
  for (const [name, sub] of Object.entries(props)) {
    if (!Object.hasOwn(value, name)) continue;
    const violation = validate(value[name], sub, { ...ctx, path: `${ctx.path}/${name}` });
    if (violation) return violation;
  }
  return undefined;
}

function checkItems(value: unknown, sub: unknown, ctx: Ctx): SchemaViolation | undefined {
  if (!Array.isArray(value)) return undefined;
  for (const [i, item] of value.entries()) {
    const violation = validate(item, sub, { ...ctx, path: `${ctx.path}/${i}` });
    if (violation) return violation;
  }
  return undefined;
}

function checkPrefixItems(value: unknown, subs: unknown, ctx: Ctx): SchemaViolation | undefined {
  if (!Array.isArray(value) || !Array.isArray(subs)) return undefined;
  for (const [i, sub] of subs.entries()) {
    if (i >= value.length) break;
    const violation = validate(value[i], sub, { ...ctx, path: `${ctx.path}/${i}` });
    if (violation) return violation;
  }
  return undefined;
}

function checkIf(
  value: unknown,
  cond: unknown,
  ctx: Ctx,
  schema: Record<string, unknown>,
): SchemaViolation | undefined {
  const branch = validate(value, cond, ctx) === undefined ? schema['then'] : schema['else'];
  return branch === undefined ? undefined : validate(value, branch, ctx);
}

const CHECKS: Record<string, Check> = {
  type: simple('type', (v, arg: string | string[]) =>
    [arg].flat().some((t) => (Object.hasOwn(TYPE_TESTS, t) ? TYPE_TESTS[t]?.(v) : false)),
  ),
  enum: simple('enum', (v, arg: unknown[]) => arg.some((e) => sameJson(e, v))),
  const: simple('const', (v, arg: unknown) => sameJson(arg, v)),
  minimum: simple('minimum', (v, a: number) => num(v, (n) => n >= a)),
  maximum: simple('maximum', (v, a: number) => num(v, (n) => n <= a)),
  exclusiveMinimum: simple('exclusiveMinimum', (v, a: number) => num(v, (n) => n > a)),
  minLength: simple('minLength', (v, a: number) => str(v, (s) => length(s) >= a)),
  maxLength: simple('maxLength', (v, a: number) => str(v, (s) => length(s) <= a)),
  pattern: simple('pattern', (v, a: string) => str(v, (s) => new RegExp(a, 'u').test(s))),
  format: simple('format', (v, a: string) =>
    str(v, (s) => {
      if (a !== 'date-time') throw new Error(`Unsupported format: ${a}`);
      return isDateTime(s);
    }),
  ),
  minItems: simple('minItems', (v, a: number) => arr(v, (x) => x.length >= a)),
  maxItems: simple('maxItems', (v, a: number) => arr(v, (x) => x.length <= a)),
  required: (value, names, ctx) =>
    isRecord(value) && !(names as string[]).every((n) => Object.hasOwn(value, n))
      ? fail(ctx, 'required')
      : undefined,
  additionalProperties: (value, arg, ctx, schema) => {
    if (arg !== false) throw new Error('Only additionalProperties: false is supported');
    const known = isRecord(schema['properties']) ? schema['properties'] : {};
    const extra = isRecord(value) && Object.keys(value).some((k) => !Object.hasOwn(known, k));
    return extra ? fail(ctx, 'additionalProperties') : undefined;
  },
  properties: checkProperties,
  items: checkItems,
  prefixItems: checkPrefixItems,
  if: checkIf,
  then: () => undefined,
  else: () => undefined,
  $ref: (value, ref, ctx) => {
    const target = resolveRef(ref as string, ctx.doc);
    return validate(value, target.schema, { ...ctx, doc: target.doc });
  },
};

/** Mots-clés acceptés : validations et annotations ignorées. */
export const SUPPORTED_KEYWORDS: ReadonlySet<string> = new Set([
  ...Object.keys(CHECKS),
  ...ANNOTATIONS,
]);

function validate(value: unknown, schema: unknown, ctx: Ctx): SchemaViolation | undefined {
  if (typeof schema === 'boolean') return schema ? undefined : fail(ctx, 'false');
  if (!isRecord(schema)) throw new Error('A JSON Schema must be an object or a boolean');
  const keywords = Object.keys(schema).filter((k) => !ANNOTATIONS.has(k));
  for (const keyword of keywords) {
    if (!Object.hasOwn(CHECKS, keyword))
      throw new Error(`Unsupported JSON Schema keyword: ${keyword}`);
  }
  for (const keyword of keywords) {
    const violation = CHECKS[keyword]?.(value, schema[keyword], ctx, schema);
    if (violation) return violation;
  }
  return undefined;
}

/** Valide `value` contre un schéma donné, dont `docKey` désigne le fichier (pour ses `$ref` locaux). */
export function checkAgainst(
  value: unknown,
  schema: unknown,
  docKey: SchemaKey,
): SchemaViolation | undefined {
  return validate(value, schema, { doc: docKey, path: '' });
}

/** Première violation de `value` contre le schéma `SCHEMA_REGISTRY[schemaKey]`, sinon `undefined`. */
export function checkSchema(value: unknown, schemaKey: SchemaKey): SchemaViolation | undefined {
  return checkAgainst(value, SCHEMA_REGISTRY[schemaKey], schemaKey);
}

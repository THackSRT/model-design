import { jsonSchemas } from '@atelier/contracts-ts';

// Validateur minimal des schémas générés (sous-ensemble utilisé par les événements du drapé : type, required,
// additionalProperties, enum, pattern, bornes, $ref relatif et $defs locaux). Ajv n'est pas une dépendance du moteur.

export type Schema = Record<string, unknown>;

const BY_REF: Record<string, Schema> = {
  '../drape/drape-result.schema.json': jsonSchemas.drapeResult as unknown as Schema,
};

export function errorsOf(value: unknown, schema: Schema, root: Schema = schema): string[] {
  const ref = schema['$ref'] as string | undefined;
  if (ref !== undefined) {
    const local = ref.startsWith('#/$defs/');
    const target = local
      ? ((root['$defs'] as Record<string, Schema>)[ref.slice(8)] as Schema)
      : (BY_REF[ref] as Schema);
    return errorsOf(value, target, local ? root : target);
  }
  const type = schema['type'] as string | undefined;
  if (type === 'object') return objectErrors(value, schema, root);
  return scalarErrors(value, schema, type);
}

function objectErrors(value: unknown, schema: Schema, root: Schema): string[] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return ['not an object'];
  const record = value as Record<string, unknown>;
  const props = (schema['properties'] ?? {}) as Record<string, Schema>;
  const errors = ((schema['required'] ?? []) as string[])
    .filter((key) => !(key in record))
    .map((key) => `missing ${key}`);
  for (const [key, v] of Object.entries(record)) {
    const sub = props[key];
    if (sub === undefined) {
      if (schema['additionalProperties'] === false) errors.push(`unexpected ${key}`);
    } else errors.push(...errorsOf(v, sub, root).map((e) => `${key}: ${e}`));
  }
  return errors;
}

function stringErrors(value: unknown, schema: Schema): string[] {
  if (typeof value !== 'string') return ['not a string'];
  const errors: string[] = [];
  const pattern = schema['pattern'] as string | undefined;
  if (pattern !== undefined && !new RegExp(pattern).test(value)) errors.push('pattern');
  const max = schema['maxLength'] as number | undefined;
  if (max !== undefined && value.length > max) errors.push('maxLength');
  if (
    schema['format'] === 'uuid' &&
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(value)
  ) {
    errors.push('uuid');
  }
  if (
    schema['format'] === 'date-time' &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    errors.push('date-time');
  }
  return errors;
}

function numberErrors(value: unknown, schema: Schema, type: string): string[] {
  if (typeof value !== 'number' || !Number.isFinite(value)) return ['not a number'];
  const errors: string[] = [];
  if (type === 'integer' && !Number.isInteger(value)) errors.push('not an integer');
  const min = schema['minimum'] as number | undefined;
  const max = schema['maximum'] as number | undefined;
  if (min !== undefined && value < min) errors.push('minimum');
  if (max !== undefined && value > max) errors.push('maximum');
  return errors;
}

function scalarErrors(value: unknown, schema: Schema, type: string | undefined): string[] {
  let errors: string[] = [];
  if ('const' in schema && schema['const'] !== value) return ['const'];
  if (type === 'string') errors = stringErrors(value, schema);
  else if (type === 'number' || type === 'integer') errors = numberErrors(value, schema, type);
  else if (type === 'boolean' && typeof value !== 'boolean') errors = ['not a boolean'];
  const options = schema['enum'] as unknown[] | undefined;
  if (options !== undefined && !options.includes(value)) errors.push('enum');
  return errors;
}

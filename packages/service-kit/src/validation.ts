import { jsonSchemas } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import { Ajv2020, type ErrorObject } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { problem, type Problem } from './problem.js';

type SchemaName = keyof typeof jsonSchemas;

// ajv-formats est publié en CommonJS : l'export par défaut peut arriver enveloppé.
const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ??
  addFormatsModule) as (ajv: Ajv2020) => void;

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const schema of Object.values(jsonSchemas)) ajv.addSchema(schema);

const describe = (e: ErrorObject): string => `${e.instancePath || '/'} ${e.message ?? 'invalide'}`;

/** Valideur d'un schéma des contrats : toute entrée passe par lui avant d'atteindre le domaine. */
export function contractValidator<T>(name: SchemaName): (input: unknown) => Result<T, Problem> {
  const id = jsonSchemas[name].$id;
  const validate = ajv.getSchema(id);
  if (!validate) throw new Error(`Schéma de contrat introuvable : ${id}`);
  return (input) => {
    if (validate(input)) return ok(input as T);
    const invalid = problem('invalid-request', 400, 'La requête ne respecte pas le contrat.');
    return err({ ...invalid, errors: (validate.errors ?? []).map(describe) });
  };
}

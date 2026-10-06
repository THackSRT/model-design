import { InvalidOptionError } from './errors.js';

/** Valeur d'une option : un nombre (les pourcentages sont des fractions, 0,12 pour 12 %), un booléen ou un choix. */
export type OptionValue = number | boolean | string;

/** Options choisies pour un tracé, par nom d'option FreeSewing (ex. `chestEase`, `lengthBonus`). */
export type DraftOptions = Readonly<Record<string, OptionValue>>;

/** Option numérique : un pourcentage (fraction), un angle, un nombre d'objets ou une longueur, dans ses bornes. */
export interface NumberOption {
  readonly name: string;
  readonly kind: 'number';
  readonly min: number;
  readonly max: number;
  /** Vrai pour un nombre d'objets. */
  readonly integer: boolean;
}

export interface BooleanOption {
  readonly name: string;
  readonly kind: 'boolean';
}

/** Option à choix : une des valeurs de la liste. */
export interface ChoiceOption {
  readonly name: string;
  readonly kind: 'choice';
  readonly values: readonly string[];
}

/** Option réglable d'un modèle, avec ce qu'il faut pour contrôler une valeur. */
export type OptionSpec = NumberOption | BooleanOption | ChoiceOption;

function problemWithNumber(spec: NumberOption, value: unknown): string | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'must be a finite number';
  if (spec.integer && !Number.isInteger(value)) return 'must be an integer';
  if (value < spec.min || value > spec.max) return `must be between ${spec.min} and ${spec.max}`;
  return undefined;
}

/** Ce qui ne va pas dans la valeur, ou `undefined` si elle convient à l'option. */
function problemWith(spec: OptionSpec, value: unknown): string | undefined {
  switch (spec.kind) {
    case 'number':
      return problemWithNumber(spec, value);
    case 'boolean':
      return typeof value === 'boolean' ? undefined : 'must be a boolean';
    case 'choice':
      return typeof value === 'string' && spec.values.includes(value)
        ? undefined
        : `must be one of ${spec.values.join(', ')}`;
  }
}

/**
 * Contrôle les options demandées avant de tracer : chacune doit être une option réglable du modèle, du bon type et
 * dans ses bornes. FreeSewing ignorerait en silence un nom inconnu et dessinerait n'importe quoi d'une valeur
 * aberrante. Erreur typée à la première option refusée.
 */
export function validateOptions(
  model: string,
  specs: readonly OptionSpec[],
  options: DraftOptions,
): void {
  for (const [name, value] of Object.entries(options)) {
    const spec = specs.find((candidate) => candidate.name === name);
    if (spec === undefined) {
      throw new InvalidOptionError(model, name, 'is not an adjustable option of this model');
    }
    const problem = problemWith(spec, value);
    if (problem !== undefined) throw new InvalidOptionError(model, name, problem);
  }
}

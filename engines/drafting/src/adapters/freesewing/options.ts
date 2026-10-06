import type { OptionSpec } from '../../core/options.js';

/** Bornes que FreeSewing suppose à une option numérique qui n'en déclare pas (valeurs de son interface). */
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 100;

/** Option numérique : bornes de FreeSewing, divisées par `scale` (les pourcentages deviennent des fractions). */
function numberSpec(
  name: string,
  raw: Record<string, unknown>,
  scale: number,
  integer: boolean,
): OptionSpec {
  const min = typeof raw.min === 'number' ? raw.min : DEFAULT_MIN;
  const max = typeof raw.max === 'number' ? raw.max : DEFAULT_MAX;
  return { name, kind: 'number', min: min / scale, max: max / scale, integer };
}

/** Le contrôle d'une option de FreeSewing, ou `undefined` pour une valeur fixe (non réglable). */
function specOf(name: string, option: unknown): OptionSpec | undefined {
  if (typeof option !== 'object' || option === null) return undefined;
  const raw = option as Record<string, unknown>;
  if (typeof raw.pct === 'number') return numberSpec(name, raw, 100, false);
  if (typeof raw.deg === 'number' || typeof raw.mm === 'number')
    return numberSpec(name, raw, 1, false);
  if (typeof raw.count === 'number') return numberSpec(name, raw, 1, true);
  if (typeof raw.bool === 'boolean') return { name, kind: 'boolean' };
  if (Array.isArray(raw.list)) return { name, kind: 'choice', values: raw.list.map(String) };
  return undefined;
}

/**
 * Options réglables d'un modèle, lues dans sa configuration FreeSewing : pourcentage (valeur en fraction : 0,12
 * pour 12 %), angle, longueur, nombre, booléen ou liste. Les valeurs fixes (`collarFactor: 4.8`) ne se règlent pas.
 */
export function optionSpecs(options: Readonly<Record<string, unknown>>): OptionSpec[] {
  const specs: OptionSpec[] = [];
  for (const [name, option] of Object.entries(options)) {
    const spec = specOf(name, option);
    if (spec !== undefined) specs.push(spec);
  }
  return specs;
}

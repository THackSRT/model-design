import { Brian } from '@freesewing/brian';
import { UnknownModelError } from '../../core/errors.js';
import type { DraftOptions, OptionSpec, OptionValue } from '../../core/options.js';
import type { ModelSheet } from '../../core/sheet.js';
import { BRIAN_SHEET } from '../../sheets/brian.js';
import type { WantedMeasurements } from '../../spec/measurements.js';
import { optionSpecs } from './options.js';
import type { FsDesign } from './types.js';

/**
 * Une mesure qu'une option rend obligatoire : FreeSewing ignore en silence l'option si la mesure manque
 * (`draftForHighBust` sans `highBust`), et le tracé ne serait pas celui qu'on a demandé.
 */
export interface OptionNeed {
  readonly option: string;
  readonly value: OptionValue;
  /** Nom FreeSewing de la mesure. */
  readonly measurement: string;
}

/** Un modèle du catalogue : sa classe FreeSewing, sa fiche de couture (une donnée) et ce que ses options exigent. */
export interface ModelEntry {
  readonly design: FsDesign;
  readonly sheet: ModelSheet;
  readonly needs: readonly OptionNeed[];
}

/**
 * Registre des modèles par clé du catalogue. Un modèle n'y entre que si son banc de validation passe (ADR 0019) ;
 * Brian est le seul pour l'instant.
 */
export const MODELS = {
  brian: {
    design: Brian,
    sheet: BRIAN_SHEET,
    needs: [{ option: 'draftForHighBust', value: true, measurement: 'highBust' }],
  },
} as const satisfies Record<string, ModelEntry>;

export type ModelKey = keyof typeof MODELS;

export const MODEL_KEYS = Object.keys(MODELS) as readonly ModelKey[];

/** Le modèle de cette clé ; erreur typée si elle n'est pas au catalogue (`Object.hasOwn` : jamais `constructor`). */
export function modelEntry(key: string): ModelEntry {
  if (!Object.hasOwn(MODELS, key)) throw new UnknownModelError(key, MODEL_KEYS);
  return MODELS[key as ModelKey];
}

/** Ce qu'un modèle demande à FreeSewing : ses mesures exigées, plus celles que les options choisies rendent exigées. */
export function wantedMeasurements(entry: ModelEntry, options: DraftOptions): WantedMeasurements {
  const config = entry.design.patternConfig;
  const forced = entry.needs
    .filter((need) => options[need.option] === need.value)
    .map((need) => need.measurement);
  const required = [...new Set([...config.measurements, ...forced])];
  const optional = config.optionalMeasurements.filter((name) => !required.includes(name));
  return { required, optional };
}

/** Description d'un modèle pour une interface : ses mesures, ses options réglables et leurs bornes. */
export interface ModelInfo {
  readonly key: ModelKey;
  /** Noms FreeSewing des mesures exigées et de celles qu'il utilise si on les lui donne. */
  readonly measurements: readonly string[];
  readonly optionalMeasurements: readonly string[];
  readonly options: readonly OptionSpec[];
  /** Pièces rapportées, par nom FreeSewing, dans l'ordre de la fiche. */
  readonly parts: readonly string[];
}

export function describeModel(key: ModelKey): ModelInfo {
  const entry = modelEntry(key);
  const config = entry.design.patternConfig;
  return {
    key,
    measurements: [...config.measurements],
    optionalMeasurements: [...config.optionalMeasurements],
    options: optionSpecs(config.options),
    parts: entry.sheet.parts.map((part) => part.part),
  };
}

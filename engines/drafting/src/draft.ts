import type { MeasurementSet } from '@atelier/contracts-ts';
import type { ModelEntry, ModelKey } from './adapters/freesewing/models.js';
import { modelEntry, wantedMeasurements } from './adapters/freesewing/models.js';
import { optionSpecs } from './adapters/freesewing/options.js';
import { runDesign } from './adapters/freesewing/run.js';
import type { SizeName } from './adapters/freesewing/sizes.js';
import { sizeMeasurements } from './adapters/freesewing/sizes.js';
import { InvalidRequestError } from './core/errors.js';
import type { DraftOptions } from './core/options.js';
import { validateOptions } from './core/options.js';
import { draftPart } from './core/part.js';
import { storeKeysOf } from './core/sheet.js';
import type { DraftedPart } from './core/types.js';
import type { FreeSewingMeasurements } from './spec/measurements.js';
import { toFreeSewingMeasurements } from './spec/measurements.js';
import { ENGINE_VERSION, FREESEWING_VERSION } from './version.js';

/** D'où viennent les mesures : une taille des tableaux de FreeSewing, ou un jeu de mesures du contrat. */
export type MeasurementSource = { readonly size: SizeName } | { readonly set: MeasurementSet };

/** Demande de tracé : un modèle du catalogue, des mesures, des options (fractions pour les pourcentages). */
export interface DraftRequest {
  readonly model: ModelKey;
  readonly measurements: MeasurementSource;
  readonly options?: DraftOptions;
}

/** Tracé d'un modèle : ses pièces découpées en bords, contrôlées, arrondies à 0,001 mm. */
export interface DraftResult {
  readonly engineVersion: string;
  readonly freesewingVersion: string;
  readonly model: ModelKey;
  /** Pièces dans l'ordre de la fiche, chacune dans son repère (x = 0 sur son axe, y = 0 en haut, y vers le bas). */
  readonly parts: readonly DraftedPart[];
  /**
   * Valeurs que la fiche déclare dans le magasin de FreeSewing, par clé du magasin, arrondies à 0,001 mm : la longueur
   * visée pour la tête de manche (`library.sleeve.sleevecapTarget`). Elles fixent l'embu des coutures (`toGarmentSpec`).
   */
  readonly values: Readonly<Record<string, number>>;
  /** Avertissements de FreeSewing et des modèles ; le tracé reste valable. */
  readonly warnings: readonly string[];
}

const isAbsent = (value: unknown): boolean => value === undefined || value === null;

/** Mesures FreeSewing de la demande : taille d'un tableau, ou jeu converti (toutes les mesures exigées, sinon erreur). */
function measurementsOf(
  key: string,
  entry: ModelEntry,
  source: MeasurementSource,
  options: DraftOptions,
): FreeSewingMeasurements {
  // Entrée d'un document : la forme est contrôlée à l'exécution, pas seulement par le type.
  const given = (typeof source === 'object' && source !== null ? source : {}) as {
    readonly size?: unknown;
    readonly set?: unknown;
  };
  if (isAbsent(given.size) === isAbsent(given.set)) {
    throw new InvalidRequestError('measurements must hold exactly one of "size" or "set"');
  }
  if (!isAbsent(given.size)) return sizeMeasurements(String(given.size));
  return toFreeSewingMeasurements(
    key,
    given.set as MeasurementSet,
    wantedMeasurements(entry, options),
  );
}

/**
 * Trace un modèle donné : le corps de `draftModel`, séparé pour qu'un test lui passe une fiche ou une classe de
 * FreeSewing de son cru. Même ordre de contrôles : options, mesures, tracé FreeSewing, puis chaque pièce.
 */
export function draftEntry(key: ModelKey, entry: ModelEntry, request: DraftRequest): DraftResult {
  const options = request.options ?? {};
  validateOptions(key, optionSpecs(entry.design.patternConfig.options), options);
  const measurements = measurementsOf(key, entry, request.measurements, options);
  const run = runDesign(key, entry.design, {
    measurements,
    options,
    parts: entry.sheet.parts.map((sheet) => sheet.part),
    values: storeKeysOf(entry.sheet),
  });
  return {
    engineVersion: ENGINE_VERSION,
    freesewingVersion: FREESEWING_VERSION,
    model: key,
    parts: entry.sheet.parts.map((sheet) => draftPart(sheet, run.parts.get(sheet.part))),
    values: run.values,
    warnings: run.warnings,
  };
}

/**
 * Trace un modèle du catalogue avec FreeSewing et le découpe en bords nommés par sa fiche de couture. Déterministe :
 * mêmes entrées, même version, même sortie. Rejette par une `DraftingError` typée : modèle, taille, option ou mesure
 * invalide ou manquante, erreur journalisée par FreeSewing, bord de la fiche introuvable, contour mal couvert.
 */
export function draftModel(request: DraftRequest): DraftResult {
  return draftEntry(request.model, modelEntry(request.model), request);
}

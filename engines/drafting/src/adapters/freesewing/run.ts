import { ContourError, FreeSewingError, SheetError } from '../../core/errors.js';
import type { DraftOptions } from '../../core/options.js';
import { roundMm } from '../../core/round.js';
import type { PathOp, PointMm, TracedPart } from '../../core/types.js';
import type { FreeSewingMeasurements } from '../../spec/measurements.js';
import type { FsDesign, FsOp, FsPart, FsPattern, FsPoint, FsSettings } from './types.js';

/** Ce que le moteur demande à FreeSewing pour un tracé. */
export interface RunInput {
  readonly measurements: FreeSewingMeasurements;
  readonly options: DraftOptions;
  /** Pièces à rapporter, par nom FreeSewing (`brian.front`) ; les autres sont tracées mais ignorées. */
  readonly parts: readonly string[];
  /** Clés du magasin de FreeSewing à lire après le tracé : les valeurs que la fiche déclare (`storeKeysOf`). */
  readonly values: readonly string[];
}

/** Résultat d'un tracé FreeSewing sans erreur journalisée. */
export interface FreeSewingRun {
  readonly parts: ReadonlyMap<string, TracedPart>;
  /** Avertissements du journal et drapeaux `warn` des modèles, sans doublon. */
  readonly warnings: readonly string[];
  /** Valeurs lues dans le magasin, par clé, arrondies à 0,001. */
  readonly values: Readonly<Record<string, number>>;
}

/** Longueur maximale d'un message de FreeSewing repris dans une erreur : elle ne grossit pas avec un message verbeux. */
const MAX_MESSAGE_LENGTH = 300;

/** Un message de journal de FreeSewing : un texte, ou `[texte, erreur]`. */
function describeLog(entry: unknown): string {
  let text: string;
  if (typeof entry === 'string') text = entry;
  else if (entry instanceof Error) text = `${entry.name}: ${entry.message}`;
  else if (Array.isArray(entry)) text = entry.map(describeLog).join(' | ');
  else text = Object.prototype.toString.call(entry);
  return text.length > MAX_MESSAGE_LENGTH ? `${text.slice(0, MAX_MESSAGE_LENGTH)}…` : text;
}

/** Identifiants des drapeaux d'un niveau (`error`, `warn`) posés par les modèles via le greffon d'annotations. */
function flagIds(store: FsPattern['store'], level: 'error' | 'warn'): string[] {
  const flags = store.plugins?.['plugin-annotations']?.flags;
  return Object.keys(flags?.[level] ?? {}).map((id) => `flag ${level} ${id}`);
}

/** Erreurs et avertissements du magasin du tracé et de ceux de chaque jeu de réglages. */
function collectLogs(pattern: FsPattern): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  for (const store of [pattern.store, ...pattern.setStores]) {
    errors.push(...store.logs.error.map(describeLog), ...flagIds(store, 'error'));
    warnings.push(...store.logs.warn.map(describeLog), ...flagIds(store, 'warn'));
  }
  return { errors: [...new Set(errors)], warnings: [...new Set(warnings)] };
}

const toPoint = (point: FsPoint): PointMm => ({ xMm: point.x, yMm: point.y });

/** Opération FreeSewing → opération du cœur ; `undefined` pour `noop`. */
function toOp(part: string, op: FsOp): PathOp | undefined {
  if (op.type === 'noop') return undefined;
  if (op.type === 'close') return { type: 'close' };
  if (op.to === undefined) {
    throw new ContourError(part, `path operation "${op.type}" has no target point`);
  }
  const to = toPoint(op.to);
  if (op.type === 'move' || op.type === 'line') return { type: op.type, to };
  if (op.type === 'curve' && op.cp1 !== undefined && op.cp2 !== undefined) {
    return { type: 'curve', cp1: toPoint(op.cp1), cp2: toPoint(op.cp2), to };
  }
  throw new ContourError(part, `unsupported path operation "${op.type}"`);
}

/** Les valeurs du magasin que la fiche déclare : un nombre fini chacune, sinon la fiche et FreeSewing divergent. */
function readValues(
  model: string,
  pattern: FsPattern,
  keys: readonly string[],
): Record<string, number> {
  const store = pattern.setStores[0];
  const values: Record<string, number> = {};
  for (const key of keys) {
    const value = store?.get(key);
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new SheetError(
        `model ${model}`,
        `FreeSewing store value "${key}" is absent or not a number`,
      );
    }
    values[key] = roundMm(value);
  }
  return values;
}

function toTracedPart(name: string, part: FsPart): TracedPart {
  const seam = part.paths.seam?.ops.flatMap((op) => toOp(name, op) ?? []);
  return {
    name,
    hidden: part.hidden === true,
    points: Object.fromEntries(
      Object.entries(part.points).map(([pointName, point]) => [pointName, toPoint(point)]),
    ),
    seam,
  };
}

/**
 * Trace un modèle FreeSewing : métrique, sans valeur de couture, sans annotations (`complete: false` : les mêmes
 * points et le même contour, un quart de temps en moins). Seul endroit où le moteur appelle FreeSewing. Les objets
 * passés à FreeSewing sont des copies. Erreur typée si le tracé lève une exception ou journalise une erreur.
 */
export function runDesign(model: string, Design: FsDesign, input: RunInput): FreeSewingRun {
  const settings: FsSettings = {
    measurements: { ...input.measurements },
    options: { ...input.options },
    sa: 0,
    complete: false,
    paperless: false,
    units: 'metric',
  };
  let pattern: FsPattern;
  try {
    pattern = new Design(settings).draft();
  } catch (error) {
    throw new FreeSewingError(model, [describeLog(error)]);
  }
  const logs = collectLogs(pattern);
  if (logs.errors.length > 0) throw new FreeSewingError(model, logs.errors);
  const drawn = pattern.parts[0] ?? {};
  const parts = new Map<string, TracedPart>();
  for (const name of input.parts) {
    const part = drawn[name];
    if (part !== undefined) parts.set(name, toTracedPart(name, part));
  }
  return { parts, warnings: logs.warnings, values: readValues(model, pattern, input.values) };
}

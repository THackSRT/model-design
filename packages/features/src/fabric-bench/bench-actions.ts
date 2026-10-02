import type { FabricPresetName, FabricProperty } from '@atelier/drape';

import {
  type DrapeDone,
  editComment,
  editCorrected,
  editField,
  editVerdict,
  finishDrape,
  startDrape,
} from './bench-edits.js';
import { type PresetBenchState, simulatedFabric } from './bench-model.js';
import { type BenchCore, canExportReport, updatePreset } from './bench-state.js';
import type { CusickRunner, DrapeWhich } from './cusick-runner.js';
import type { DraftValue } from './measurement-draft.js';
import { fromReport, toReport } from './report-mapping.js';
import { parseFabricValidationReport, serializeFabricValidationReport } from './report-file.js';
import { checkSchema } from './schema-check.js';
import type { Verdict } from './verdict.js';
import type { FileSaver } from '../cut-pieces/use-cut-pieces.js';

export interface FabricBenchDeps {
  saver: FileSaver;
  now(): Date;
  /** Absent : l'essai de drapé simulé est indisponible (`drapeTestAvailable` faux). */
  cusick?: CusickRunner;
}

export interface FabricBenchActions {
  select(preset: FabricPresetName): void;
  /** Saisie d'un champ d'essai, par chemin (`stretchWarp.loadedLengthMm`, `thickness.readingsMm.2`) ; `undefined` le vide. */
  setField(preset: FabricPresetName, path: string, value: DraftValue | undefined): void;
  setVerdict(preset: FabricPresetName, verdict: Verdict): void;
  /** Valeur corrigée d'une propriété (verdict `corrected` seulement) ; `undefined` la vide. */
  setCorrected(preset: FabricPresetName, property: FabricProperty, value: number | undefined): void;
  setComment(preset: FabricPresetName, comment: string): void;
  runDrape(preset: FabricPresetName, which: DrapeWhich): Promise<void>;
  /** Télécharge le rapport ; sans effet tant que `canExport` est faux. */
  exportReport(): void;
  /** Remplace l'état par celui d'un rapport ; un fichier refusé laisse l'état intact (`importStatus` `failed`). */
  importReport(text: string): void;
}

/** Accès à l'état courant, lu et écrit de façon synchrone (les actions s'enchaînent sans rendu entre elles). */
export interface BenchStore {
  get(): BenchCore;
  set(next: BenchCore): void;
}

const EXPORT_MIME = 'application/json';

function exportReport(store: BenchStore, deps: FabricBenchDeps): void {
  const core = store.get();
  if (!core.canExport) return;
  const now = deps.now();
  const report = toReport(core, now);
  const violation = checkSchema(report, 'fabricValidationReport');
  if (violation) {
    throw new Error(`Rapport non conforme au contrat : ${violation.path} (${violation.keyword})`);
  }
  const blob = new Blob([serializeFabricValidationReport(report)], { type: EXPORT_MIME });
  deps.saver.save(blob, `rapport-tissus-${now.toISOString().slice(0, 10)}.json`);
  store.set({ ...core, dirty: false });
}

function importReport(store: BenchStore, text: string): void {
  const core = store.get();
  const parsed = parseFabricValidationReport(text);
  if (parsed.isErr()) {
    store.set({ ...core, importStatus: 'failed', importError: parsed.error });
    return;
  }
  const imported = fromReport(parsed.value);
  store.set({
    ...core,
    presets: imported.presets,
    createdAt: imported.createdAt,
    dirty: false,
    canExport: canExportReport(imported.presets),
    importStatus: 'imported',
    importError: undefined,
    importNotices: imported.notices,
  });
}

async function runDrape(
  store: BenchStore,
  deps: FabricBenchDeps,
  preset: FabricPresetName,
  which: DrapeWhich,
): Promise<void> {
  const cusick = deps.cusick;
  const current = store.get().presets.find((p) => p.preset === preset);
  if (!cusick || !current) return;
  const fabric = simulatedFabric(current, which);
  store.set(updatePreset(store.get(), preset, (p) => startDrape(p, which), false));
  let outcome: DrapeDone['outcome'];
  try {
    outcome = { run: await cusick.run(fabric) };
  } catch {
    outcome = { failed: true };
  }
  const done = (p: PresetBenchState) => finishDrape(p, { which, fabric, outcome }, deps.now());
  store.set(updatePreset(store.get(), preset, done, 'run' in outcome));
}

/** Les actions du banc d'essai, sur un accès à l'état ; le hook en fournit un, les tests peuvent en fournir un autre. */
export function createBenchActions(store: BenchStore, deps: FabricBenchDeps): FabricBenchActions {
  const update = (preset: FabricPresetName, change: Parameters<typeof updatePreset>[2]): void =>
    store.set(updatePreset(store.get(), preset, change));
  return {
    select: (selected) => store.set({ ...store.get(), selected }),
    setField: (preset, path, value) => update(preset, (p) => editField(p, path, value, deps.now())),
    setVerdict: (preset, verdict) => update(preset, (p) => editVerdict(p, verdict, deps.now())),
    setCorrected: (preset, property, value) =>
      update(preset, (p) => editCorrected(p, property, value, deps.now())),
    setComment: (preset, comment) => update(preset, (p) => editComment(p, comment, deps.now())),
    runDrape: (preset, which) => runDrape(store, deps, preset, which),
    exportReport: () => exportReport(store, deps),
    importReport: (text) => importReport(store, text),
  };
}

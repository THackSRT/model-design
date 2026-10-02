import type { FabricPresetName } from '@atelier/drape';
import type { ReportImportError } from './report-file.js';
import {
  initialPresetState,
  isExportable,
  PRESET_NAMES,
  type PresetBenchState,
} from './bench-model.js';
import type { ImportNotice } from './report-mapping.js';

/** État du banc d'essai sans ce qui dépend des dépendances injectées. */
export interface BenchCore {
  /** Une revue par préréglage, dans l'ordre de `FABRIC_PRESETS`. */
  presets: PresetBenchState[];
  selected: FabricPresetName;
  /** Création du rapport (ISO UTC) : l'ouverture de l'écran, ou celle du rapport importé. */
  createdAt: string;
  /** Modifications non exportées : l'écran prévient avant de quitter la page. */
  dirty: boolean;
  /** Vrai s'il y a une revue touchée et que toutes les revues touchées sont exportables. */
  canExport: boolean;
  importStatus: 'idle' | 'imported' | 'failed';
  importError?: ReportImportError;
  importNotices: ImportNotice[];
}

export const canExportReport = (presets: readonly PresetBenchState[]): boolean =>
  presets.some((p) => p.touched) && presets.filter((p) => p.touched).every(isExportable);

export function initialCore(now: Date): BenchCore {
  const presets = PRESET_NAMES.map(initialPresetState);
  return {
    presets,
    selected: PRESET_NAMES[0] ?? 'cotton-poplin',
    createdAt: now.toISOString(),
    dirty: false,
    canExport: false,
    importStatus: 'idle',
    importNotices: [],
  };
}

/** Remplace une revue ; sauf `dirties` faux (essai en cours ou échoué), l'état n'est plus celui du dernier export. */
export function updatePreset(
  core: BenchCore,
  preset: FabricPresetName,
  change: (p: PresetBenchState) => PresetBenchState,
  dirties = true,
): BenchCore {
  const presets = core.presets.map((p) => (p.preset === preset ? change(p) : p));
  const changed = presets.some((p, i) => p !== core.presets[i]);
  return changed
    ? { ...core, presets, dirty: core.dirty || dirties, canExport: canExportReport(presets) }
    : core;
}

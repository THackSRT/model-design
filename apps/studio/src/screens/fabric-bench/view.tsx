import type { FabricBenchActions, FabricBenchState } from '@atelier/features';
import { tBench } from '../../i18n/bench.js';
import { ComparisonPanel } from './comparison-panel.js';
import { DrapePanel } from './drape-panel.js';
import { MeasurementsPanel } from './measurements-panel.js';
import { PresetList } from './preset-list.js';
import { ReportBar } from './report-bar.js';
import { ReviewPanel } from './review-panel.js';

export interface FabricBenchViewProps {
  state: FabricBenchState;
  actions: FabricBenchActions;
  /** Fichier de rapport choisi : l'écran le lit puis le passe à `actions.importReport`. */
  onImportFile: (file: File) => void;
}

/** Vue purement visuelle du banc d'essai : elle ne reçoit que l'état, les actions et le fichier choisi. */
export function FabricBenchView({ state, actions, onImportFile }: FabricBenchViewProps) {
  const preset = state.presets.find((p) => p.preset === state.selected);
  return (
    <main className="bench">
      <header className="bench-header">
        <h1>{tBench('fabricBench.title')}</h1>
        <p>{tBench('fabricBench.subtitle')}</p>
      </header>
      <aside className="bench-side">
        <PresetList presets={state.presets} selected={state.selected} onSelect={actions.select} />
        <ReportBar state={state} onExport={actions.exportReport} onImportFile={onImportFile} />
      </aside>
      {preset && (
        <div className="bench-main">
          <MeasurementsPanel
            preset={preset}
            onField={(path, value) => actions.setField(preset.preset, path, value)}
          />
          <div className="bench-results">
            <ComparisonPanel preset={preset} />
            {state.drapeTestAvailable && (
              <DrapePanel
                preset={preset}
                onRun={(which) => void actions.runDrape(preset.preset, which)}
              />
            )}
            <ReviewPanel
              preset={preset}
              onVerdict={(verdict) => actions.setVerdict(preset.preset, verdict)}
              onCorrected={(property, value) =>
                actions.setCorrected(preset.preset, property, value)
              }
              onComment={(comment) => actions.setComment(preset.preset, comment)}
            />
          </div>
        </div>
      )}
    </main>
  );
}

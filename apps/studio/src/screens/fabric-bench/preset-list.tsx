import type { FabricBenchState, PresetBenchState } from '@atelier/features';
import { Button, Panel } from '@atelier/ui-web';
import { presetName, verdictLabel, tBench } from '../../i18n/bench.js';

export interface PresetListProps {
  presets: readonly PresetBenchState[];
  selected: FabricBenchState['selected'];
  onSelect: (preset: PresetBenchState['preset']) => void;
}

/** Les préréglages avec leur verdict ; « modifié » marque une revue commencée. */
export function PresetList({ presets, selected, onSelect }: PresetListProps) {
  return (
    <Panel title={tBench('fabricBench.presets.title')}>
      <ul className="bench-presets">
        {presets.map((p) => (
          <li key={p.preset}>
            <Button
              emphasis={p.preset === selected ? 'high' : 'normal'}
              aria-pressed={p.preset === selected}
              onClick={() => onSelect(p.preset)}
            >
              <span>{presetName(p.preset)}</span> <small>{verdictLabel(p.verdict)}</small>
              {p.touched && <small> · {tBench('fabricBench.preset.modified')}</small>}
            </Button>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

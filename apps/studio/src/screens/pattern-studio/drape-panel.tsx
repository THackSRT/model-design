import { DRAPE_ARM_ANGLE_DEG, type DrapeActions, type DrapeState } from '@atelier/features';
import { Button, Message, Panel } from '@atelier/ui-web';
import { drapeProblemMessage, problemMessage, t } from '../../i18n/t.js';
import { DRAPE_PRESETS, type DrapePreset } from './drape-fabrics.js';

export interface DrapePanelProps {
  state: DrapeState;
  actions: DrapeActions;
  preset: DrapePreset;
  onPresetChange(preset: DrapePreset): void;
  /** Le vêtement drapé est celui qui est montré sur le mannequin. */
  shown: boolean;
  onShownChange(shown: boolean): void;
}

function Outcome({ state }: Pick<DrapePanelProps, 'state'>) {
  switch (state.status) {
    case 'requesting':
    case 'pending':
      return <Message>{t('drape.working')}</Message>;
    case 'failed':
      return <Message tone="danger">{drapeProblemMessage(state.problemType)}</Message>;
    case 'error':
      return <Message tone="danger">{problemMessage(state.problem?.type ?? '')}</Message>;
    case 'completed':
      return <Message>{t('drape.ready')}</Message>;
    case 'idle':
      return <Message>{t('drape.hint', { angleDeg: DRAPE_ARM_ANGLE_DEG })}</Message>;
  }
}

/** Choix du tissu et demande de drapé de la version enregistrée ; la progression et l'échec s'y lisent. */
export function DrapePanel({
  state,
  actions,
  preset,
  onPresetChange,
  shown,
  onShownChange,
}: DrapePanelProps) {
  return (
    <Panel title={t('drape.title')}>
      <label className="studio-select">
        {t('drape.fabric')}
        <select value={preset} onChange={(e) => onPresetChange(e.target.value as DrapePreset)}>
          {DRAPE_PRESETS.map((name) => (
            <option key={name} value={name}>
              {t(`drape.fabric.${name}`)}
            </option>
          ))}
        </select>
      </label>
      <Button emphasis="high" disabled={!state.canRequest} onClick={actions.request}>
        {t('drape.request')}
      </Button>
      <Outcome state={state} />
      {state.status === 'completed' && state.drape?.fabricEstimated && (
        <Message>{t('drape.estimated')}</Message>
      )}
      {state.status === 'completed' && (
        <Button
          aria-pressed={shown}
          emphasis={shown ? 'high' : 'normal'}
          onClick={() => onShownChange(!shown)}
        >
          {t('drape.show')}
        </Button>
      )}
    </Panel>
  );
}

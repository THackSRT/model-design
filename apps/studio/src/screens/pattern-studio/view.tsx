import {
  MEASUREMENT_KEYS,
  type PatternStudioActions,
  type PatternStudioState,
} from '@atelier/features';
import { ColorMannequin } from '@atelier/design-tokens';
import { Button, Message, NumberField, Panel } from '@atelier/ui-web';
import { MannequinOutline, MannequinView, type SilhouetteView } from '@atelier/viewer3d';
import { useMemo } from 'react';
import { problemMessage, t } from '../../i18n/t.js';

export interface PatternStudioViewProps {
  state: PatternStudioState;
  actions: PatternStudioActions;
}

const SKIRT_FIELDS = ['length', 'waistEase', 'hipEase', 'hemFlare'] as const;

function MeasurementsPanel({ state, actions }: PatternStudioViewProps) {
  return (
    <Panel title={t('measurements.title')}>
      <label className="studio-select">
        {t('measurements.sex')}
        <select
          value={state.form.sex}
          onChange={(e) => actions.setSex(e.target.value as 'female' | 'male')}
        >
          <option value="female">{t('measurements.sex.female')}</option>
          <option value="male">{t('measurements.sex.male')}</option>
        </select>
      </label>
      {MEASUREMENT_KEYS.map((key) => (
        <NumberField
          key={key}
          label={t(`measurements.${key}`)}
          unit={t('unit.cm')}
          step={0.5}
          value={state.form.measurementsCm[key]}
          invalid={Boolean(state.errors[key])}
          onChange={(cm) => actions.setMeasurement(key, cm)}
        />
      ))}
    </Panel>
  );
}

function SkirtPanel({ state, actions }: PatternStudioViewProps) {
  return (
    <Panel title={t('skirt.title')}>
      {SKIRT_FIELDS.map((key) => (
        <NumberField
          key={key}
          label={t(`skirt.${key}`)}
          unit={t('unit.cm')}
          step={0.5}
          value={state.form.skirtCm[key]}
          invalid={key === 'length' && Boolean(state.errors.length)}
          onChange={(cm) => actions.setSkirt(key, cm)}
        />
      ))}
      <Button emphasis="high" disabled={state.status === 'working'} onClick={actions.generate}>
        {t('action.generate')}
      </Button>
      <StatusMessage state={state} />
    </Panel>
  );
}

function StatusMessage({ state }: { state: PatternStudioState }) {
  if (state.problem) return <Message tone="danger">{problemMessage(state.problem.type)}</Message>;
  if (state.status === 'working') return <Message>{t('status.working')}</Message>;
  if (state.status === 'idle') return <Message>{t('status.idle')}</Message>;
  return <Message>{t('pattern.version', { number: state.versionNumber ?? 0 })}</Message>;
}

function PatternPanel({ state }: { state: PatternStudioState }) {
  return (
    <Panel title={t('pattern.title')}>
      {state.layout && (
        <svg
          className="studio-pattern"
          viewBox={state.layout.viewBox}
          role="img"
          aria-label={t('pattern.title')}
        >
          {state.layout.panels.map((panel) => (
            <g key={panel.id}>
              <path d={panel.path} />
              <text x={panel.labelAt[0]} y={panel.labelAt[1]} textAnchor="middle">
                {panel.name}
              </text>
            </g>
          ))}
        </svg>
      )}
    </Panel>
  );
}

const OUTLINE_VIEWS: readonly SilhouetteView[] = ['front', 'side', 'back'];
const DISPLAYS = ['3d', 'outline'] as const;

function DisplayToggle({ state, actions }: PatternStudioViewProps) {
  return (
    <div role="group" aria-label={t('mannequin.display')} className="studio-toggle">
      {DISPLAYS.map((display) => (
        <Button
          key={display}
          emphasis={state.display === display ? 'high' : 'normal'}
          aria-pressed={state.display === display}
          onClick={() => actions.setDisplay(display)}
        >
          {t(`mannequin.display.${display}`)}
        </Button>
      ))}
    </div>
  );
}

function MannequinBody({ state }: { state: PatternStudioState }) {
  const meshes = useMemo(() => (state.mannequin ? [state.mannequin.body] : []), [state.mannequin]);
  const labels = {
    front: t('mannequin.view.front'),
    side: t('mannequin.view.side'),
    back: t('mannequin.view.back'),
  };
  const body = meshes[0];
  if (!body) return null;
  return state.display === 'outline' ? (
    <MannequinOutline mesh={body} views={OUTLINE_VIEWS} labels={labels} />
  ) : (
    <MannequinView
      meshes={meshes}
      color={ColorMannequin}
      label={t('mannequin.label')}
      webglUnavailableLabel={t('mannequin.webglUnavailable')}
    />
  );
}

function MannequinPanel(props: PatternStudioViewProps) {
  const { state } = props;
  return (
    <Panel title={t('mannequin.title')}>
      <DisplayToggle {...props} />
      {state.mannequinStatus === 'fitting' && <Message>{t('mannequin.fitting')}</Message>}
      {state.mannequinStatus === 'failed' && (
        <Message tone="danger">{t('mannequin.failed')}</Message>
      )}
      <div className="studio-viewer">
        <MannequinBody state={state} />
      </div>
    </Panel>
  );
}

/** Vue purement visuelle : elle ne reçoit que { state, actions } et n'appelle rien elle-même. */
export function PatternStudioView(props: PatternStudioViewProps) {
  return (
    <main className="studio">
      <header className="studio-header">
        <h1>{t('app.title')}</h1>
        <p>{t('app.subtitle')}</p>
      </header>
      <div className="studio-inputs">
        <MeasurementsPanel {...props} />
        <SkirtPanel {...props} />
      </div>
      <PatternPanel state={props.state} />
      <MannequinPanel {...props} />
    </main>
  );
}

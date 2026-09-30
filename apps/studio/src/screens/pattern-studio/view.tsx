import {
  MEASUREMENT_KEYS,
  type PatternStudioActions,
  type PatternStudioState,
} from '@atelier/features';
import { ColorMannequin } from '@atelier/design-tokens';
import { Button, Message, NumberField, Panel } from '@atelier/ui-web';
import { MannequinView } from '@atelier/viewer3d';
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

function MannequinPanel({ state }: { state: PatternStudioState }) {
  const meshes = useMemo(() => (state.mannequin ? [state.mannequin.body] : []), [state.mannequin]);
  return (
    <Panel title={t('mannequin.title')}>
      <div className="studio-viewer">
        {meshes.length > 0 && (
          <MannequinView meshes={meshes} color={ColorMannequin} label={t('mannequin.label')} />
        )}
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
      <MannequinPanel state={props.state} />
    </main>
  );
}

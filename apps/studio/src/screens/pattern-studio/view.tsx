import {
  measurementKeys,
  type FieldError,
  type PatternStudioActions,
  type PatternStudioState,
} from '@atelier/features';
import { NumberField, Panel } from '@atelier/ui-web';
import { fieldErrorMessage, t } from '../../i18n/t.js';
import { CutPiecesPanel, type CutPiecesPanelProps } from './cut-pieces-panel.js';
import { HistoryPanel, type HistoryPanelProps } from './history-panel.js';
import { GarmentPanel } from './garment-panel.js';
import { MannequinPanel } from './mannequin-panel.js';

export interface PatternStudioViewProps {
  state: PatternStudioState;
  actions: PatternStudioActions;
  /** Pièces de coupe et téléchargements de la version calculée ; absents : pas de panneau. */
  cutPieces?: CutPiecesPanelProps;
  /** Historique des versions du modèle de la session ; absent : pas de panneau. */
  history?: HistoryPanelProps;
}

const FIELD_UNIT = 'cm' as const; // les champs du formulaire se saisissent en cm
const errorText = (error: FieldError | undefined) => error && fieldErrorMessage(error, FIELD_UNIT);

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
      {measurementKeys(state.form.garmentType).map((key) => (
        <NumberField
          key={key}
          label={t(`measurements.${key}`)}
          unit={t(`unit.${FIELD_UNIT}`)}
          step={0.5}
          value={state.form.measurementsCm[key]}
          error={errorText(state.errors[key])}
          onChange={(cm) => actions.setMeasurement(key, cm)}
        />
      ))}
    </Panel>
  );
}

function PatternPanel({ state }: { state: PatternStudioState }) {
  return (
    <Panel title={t('pattern.title')}>
      {state.layout && <p>{t('pattern.pieces', { count: state.layout.panels.length })}</p>}
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
        <GarmentPanel {...props} />
      </div>
      <PatternPanel state={props.state} />
      {props.cutPieces && <CutPiecesPanel {...props.cutPieces} />}
      {props.history && <HistoryPanel {...props.history} />}
      <MannequinPanel {...props} />
    </main>
  );
}

import {
  garmentFields,
  GARMENT_TYPES,
  isDraftedGarmentType,
  type FieldError,
  type GarmentField,
} from '@atelier/features';
import { Button, Message, NumberField, Panel } from '@atelier/ui-web';
import { fieldErrorMessage, garmentName, paramLabel, problemMessage, t } from '../../i18n/t.js';
import type { PatternStudioViewProps } from './view.js';

const errorText = (error: FieldError | undefined) => error && fieldErrorMessage(error, 'cm');

function optionLabel(type: string): string {
  const name = garmentName(type);
  return isDraftedGarmentType(type) ? name : t('garment.unavailable', { name });
}

function GarmentSelect({ state, actions }: PatternStudioViewProps) {
  return (
    <label className="studio-select">
      {t('garment.label')}
      <select
        value={state.form.garmentType}
        onChange={(e) => actions.setGarmentType(e.target.value as typeof state.form.garmentType)}
      >
        {GARMENT_TYPES.map((type) => (
          <option key={type} value={type} disabled={!isDraftedGarmentType(type)}>
            {optionLabel(type)}
          </option>
        ))}
      </select>
    </label>
  );
}

function ParamField({ field, props }: { field: GarmentField; props: PatternStudioViewProps }) {
  const { state, actions } = props;
  const type = state.form.garmentType;
  return (
    <NumberField
      label={paramLabel(type, field.param)}
      unit={field.unit === 'cm' ? t('unit.cm') : ''}
      step={field.unit === 'cm' ? 0.5 : 0.05}
      value={state.form.paramsByType[type]?.[field.param]}
      error={errorText(state.errors[field.param])}
      onChange={(value) => actions.setParam(field.param, value)}
    />
  );
}

function StatusMessage({ state }: Pick<PatternStudioViewProps, 'state'>) {
  if (state.problem) return <Message tone="danger">{problemMessage(state.problem.type)}</Message>;
  if (state.status === 'working') return <Message>{t('status.working')}</Message>;
  if (state.status === 'idle') return <Message>{t('status.idle')}</Message>;
  return <Message>{t('pattern.version', { number: state.versionNumber ?? 0 })}</Message>;
}

/** Choix du type de vêtement, champs de ce type (décrits par le contrat) et lancement du calcul. */
export function GarmentPanel(props: PatternStudioViewProps) {
  const { state, actions } = props;
  const type = state.form.garmentType;
  const fields = isDraftedGarmentType(type) ? garmentFields(type) : [];
  return (
    <Panel title={t('garment.title')}>
      <GarmentSelect {...props} />
      {fields.map((field) => (
        <ParamField key={`${type}.${field.param}`} field={field} props={props} />
      ))}
      <Button emphasis="high" disabled={state.status === 'working'} onClick={actions.generate}>
        {t('action.generate')}
      </Button>
      <StatusMessage state={state} />
    </Panel>
  );
}

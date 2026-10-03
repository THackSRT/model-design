import type { FinishedField } from '@atelier/features';
import { Button, NumberField } from '@atelier/ui-web';
import { fieldErrorMessage, t } from '../../i18n/t.js';
import { easeCm } from './finished-format.js';
import type { PatternStudioViewProps } from './view.js';

function FinishedRow({ field, props }: { field: FinishedField; props: PatternStudioViewProps }) {
  const { state, actions } = props;
  const ease = easeCm(field, state.form.measurementsCm);
  return (
    <div className="studio-finished" data-source={field.source}>
      <NumberField
        label={t(`finished.${field.key}`)}
        unit={t('unit.cm')}
        step={0.5}
        value={field.valueCm}
        error={field.error && fieldErrorMessage(field.error, 'cm')}
        onChange={(cm) => actions.setFinished(field.key, cm)}
      />
      <small className="studio-finished-info">
        <span>{t(`finished.source.${field.source}`)}</span>
        {ease !== undefined && <span> {t('finished.ease', { easeCm: ease })}</span>}
      </small>
      {field.source === 'manual' && (
        <Button
          aria-label={t('finished.recalculateField', { name: t(`finished.${field.key}`) })}
          onClick={() => actions.recalculateFinished(field.key)}
        >
          {t('finished.recalculate')}
        </Button>
      )}
    </div>
  );
}

/** Mesures finies du vêtement : pré-remplies depuis le corps, modifiables, avec leur origine. */
export function FinishedFields(props: PatternStudioViewProps) {
  const fields = props.state.finished;
  if (fields.length === 0) return null;
  return (
    <>
      {fields.map((field) => (
        <FinishedRow key={field.key} field={field} props={props} />
      ))}
      <Button
        disabled={fields.every((f) => f.source === 'auto')}
        onClick={() => props.actions.recalculateFinished()}
      >
        {t('finished.recalculateAll')}
      </Button>
    </>
  );
}

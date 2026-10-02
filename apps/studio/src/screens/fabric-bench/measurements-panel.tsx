import {
  type BenchField,
  type BenchTest,
  BENCH_TESTS,
  type PresetBenchState,
} from '@atelier/features';
import { ChoiceGroup, Message, NumberField, Panel } from '@atelier/ui-web';
import {
  benchErrorMessage,
  fieldLabel,
  optionLabel,
  paramUnit,
  testTip,
  testTitle,
  tBench,
} from '../../i18n/bench.js';
import { stepFor, visibleReadings } from './series.js';

export interface MeasurementsPanelProps {
  preset: PresetBenchState;
  onField: (path: string, value: number | string | undefined) => void;
}

interface FieldProps extends MeasurementsPanelProps {
  field: BenchField;
}

function errorFor(preset: PresetBenchState, path: string, field: BenchField): string | undefined {
  const error = preset.errors[path];
  return error && benchErrorMessage(error, paramUnit(field.param));
}

function NumberInput({ preset, field, onField }: FieldProps) {
  const value = preset.draft[field.path];
  return (
    <NumberField
      label={fieldLabel(field.param)}
      unit={paramUnit(field.param)}
      step={stepFor(field.max)}
      value={typeof value === 'number' ? value : undefined}
      error={errorFor(preset, field.path, field)}
      onChange={(next) => onField(field.path, next)}
    />
  );
}

function SeriesInput({ preset, field, onField }: FieldProps) {
  const count = visibleReadings(preset.draft, field.path, field.maxItems ?? 1);
  return Array.from({ length: count }, (_, index) => {
    const path = `${field.path}.${index}`;
    const value = preset.draft[path];
    // « required » vise la série entière : il s'affiche sur la première lecture.
    const error =
      errorFor(preset, path, field) ??
      (index === 0 ? errorFor(preset, field.path, field) : undefined);
    return (
      <NumberField
        key={path}
        label={fieldLabel(field.param, index + 1)}
        unit={paramUnit(field.param)}
        step={stepFor(field.max)}
        value={typeof value === 'number' ? value : undefined}
        error={error}
        onChange={(next) => onField(path, next)}
      />
    );
  });
}

function ChoiceInput({ preset, field, onField }: FieldProps) {
  const value = preset.draft[field.path];
  const error = errorFor(preset, field.path, field);
  return (
    <>
      <ChoiceGroup
        legend={fieldLabel(field.param)}
        options={(field.options ?? []).map((option) => ({
          value: option,
          label: optionLabel(option),
        }))}
        value={typeof value === 'string' ? value : undefined}
        onChange={(next) => onField(field.path, next)}
      />
      {error && <Message tone="danger">{error}</Message>}
    </>
  );
}

function Field(props: FieldProps) {
  switch (props.field.kind) {
    case 'series':
      return <SeriesInput {...props} />;
    case 'choice':
      return <ChoiceInput {...props} />;
    case 'number':
      return <NumberInput {...props} />;
    case 'fixed':
      return null;
  }
}

function TestSection({ test, ...rest }: MeasurementsPanelProps & { test: BenchTest }) {
  const tip = testTip(test.key);
  return (
    <Panel title={testTitle(test.key)}>
      {tip && <p className="bench-tip">{tip}</p>}
      {test.fields.map((field) => (
        <Field key={field.path} field={field} {...rest} />
      ))}
    </Panel>
  );
}

/** Saisie des essais d'atelier : les champs, leurs bornes et leurs conseils viennent du contrat (BENCH_TESTS). */
export function MeasurementsPanel(props: MeasurementsPanelProps) {
  return (
    <section className="bench-measurements" aria-label={tBench('fabricBench.measurements.title')}>
      <h2>{tBench('fabricBench.measurements.title')}</h2>
      {BENCH_TESTS.map((test) => (
        <TestSection key={test.key} test={test} {...props} />
      ))}
    </section>
  );
}

import { useId } from 'react';

export interface NumberFieldProps {
  label: string;
  value: number | undefined;
  unit: string;
  onChange: (value: number | undefined) => void;
  step?: number;
  invalid?: boolean;
  /** Message d'erreur déjà traduit, annoncé et relié au champ. */
  error?: string;
}

export function NumberField({
  label,
  value,
  unit,
  onChange,
  step = 1,
  invalid = false,
  error,
}: NumberFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const isInvalid = invalid || error !== undefined;
  return (
    <div className="ui-field" data-invalid={isInvalid}>
      <label htmlFor={id}>{label}</label>
      <span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ''}
          aria-invalid={isInvalid}
          aria-describedby={error === undefined ? undefined : errorId}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />{' '}
        {unit}
      </span>
      {error !== undefined && (
        <small id={errorId} role="alert" className="ui-field-error">
          {error}
        </small>
      )}
    </div>
  );
}

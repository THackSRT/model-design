import { useId } from 'react';

export interface NumberFieldProps {
  label: string;
  value: number | undefined;
  unit: string;
  onChange: (value: number | undefined) => void;
  step?: number;
  invalid?: boolean;
}

export function NumberField({
  label,
  value,
  unit,
  onChange,
  step = 1,
  invalid = false,
}: NumberFieldProps) {
  const id = useId();
  return (
    <div className="ui-field" data-invalid={invalid}>
      <label htmlFor={id}>{label}</label>
      <span>
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={value ?? ''}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />{' '}
        {unit}
      </span>
    </div>
  );
}

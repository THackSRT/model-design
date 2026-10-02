import { useId } from 'react';

export interface ChoiceOption {
  value: string;
  label: string;
}

export interface ChoiceGroupProps {
  /** Légende du groupe, déjà traduite. */
  legend: string;
  options: readonly ChoiceOption[];
  value: string | undefined;
  onChange: (value: string) => void;
}

export function ChoiceGroup({ legend, options, value, onChange }: ChoiceGroupProps) {
  const name = useId();
  return (
    <fieldset className="ui-choice-group">
      <legend>{legend}</legend>
      {options.map((option) => (
        <label key={option.value} className="ui-choice">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />{' '}
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}

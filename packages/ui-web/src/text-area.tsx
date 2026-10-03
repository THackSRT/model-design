import { useId } from 'react';

export interface TextAreaProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  rows?: number;
  /** Compteur déjà formaté et traduit (ex. « 12 / 500 »), fourni par l'appelant. */
  counter?: string;
  /** Message d'erreur déjà traduit, annoncé et relié au champ. */
  error?: string;
}

export function TextArea({
  label,
  value,
  onChange,
  maxLength,
  rows = 4,
  counter,
  error,
}: TextAreaProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const counterId = `${id}-counter`;
  const describedBy = [counter === undefined ? '' : counterId, error === undefined ? '' : errorId]
    .filter((s) => s !== '')
    .join(' ');
  return (
    <div className="ui-textarea" data-invalid={error !== undefined}>
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={value}
        rows={rows}
        maxLength={maxLength}
        aria-invalid={error !== undefined}
        aria-describedby={describedBy === '' ? undefined : describedBy}
        onChange={(e) => onChange(e.target.value)}
      />
      {counter !== undefined && (
        <small id={counterId} className="ui-textarea-counter">
          {counter}
        </small>
      )}
      {error !== undefined && (
        <small id={errorId} role="alert" className="ui-field-error">
          {error}
        </small>
      )}
    </div>
  );
}

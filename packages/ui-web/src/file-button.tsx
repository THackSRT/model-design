import { useRef, type ChangeEvent, type ReactNode } from 'react';

export interface FileButtonProps {
  children: ReactNode;
  onFile: (file: File) => void;
  /** Types acceptés, comme l'attribut `accept` (ex. « image/png,.jpg »). */
  accept?: string;
  emphasis?: 'normal' | 'high';
  disabled?: boolean;
}

export function FileButton({
  children,
  onFile,
  accept,
  emphasis = 'normal',
  disabled = false,
}: FileButtonProps) {
  const input = useRef<HTMLInputElement>(null);

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Réinitialiser permet de rechoisir le même fichier.
    event.target.value = '';
    if (file !== undefined) onFile(file);
  };

  return (
    <>
      <button
        type="button"
        className="ui-button"
        data-emphasis={emphasis}
        disabled={disabled}
        onClick={() => input.current?.click()}
      >
        {children}
      </button>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        tabIndex={-1}
        data-testid="ui-file-input"
        onChange={onChange}
      />
    </>
  );
}

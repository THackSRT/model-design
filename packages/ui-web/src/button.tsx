import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** L'intention, pas l'apparence : `high` pour l'action principale de l'écran. */
  emphasis?: 'normal' | 'high';
}

export function Button({ emphasis = 'normal', type = 'button', ...rest }: ButtonProps) {
  return <button {...rest} type={type} className="ui-button" data-emphasis={emphasis} />;
}

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Button, Message, NumberField, Panel } from './index.js';

describe('composants', () => {
  it('un champ numérique est relié à son libellé et renvoie un nombre', async () => {
    const onChange = vi.fn();
    function Harness() {
      const [value, setValue] = useState<number | undefined>(70);
      return (
        <NumberField
          label="Tour de taille"
          value={value}
          unit="cm"
          onChange={(v) => {
            setValue(v);
            onChange(v);
          }}
        />
      );
    }
    render(<Harness />);
    const input = screen.getByLabelText('Tour de taille');
    await userEvent.clear(input);
    await userEvent.type(input, '72');
    expect(onChange).toHaveBeenLastCalledWith(72);
  });

  it('un champ invalide est annoncé comme tel', () => {
    render(<NumberField label="Stature" value={10} unit="cm" invalid onChange={() => undefined} />);
    expect(screen.getByLabelText('Stature').getAttribute('aria-invalid')).toBe('true');
  });

  it('un panneau est une région nommée ; une erreur est une alerte', () => {
    render(
      <Panel title="Mesures">
        <Message tone="danger">Moteur indisponible</Message>
        <Button emphasis="high">Calculer</Button>
      </Panel>,
    );
    expect(screen.getByRole('region', { name: 'Mesures' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toBe('Moteur indisponible');
  });
});

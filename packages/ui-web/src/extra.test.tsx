import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ChoiceGroup, FileButton, Tabs, TextArea } from './index.js';

const TABS = [
  { id: 'a', label: 'Alpha', panel: <p>Contenu A</p> },
  { id: 'b', label: 'Beta', panel: <p>Contenu B</p> },
  { id: 'c', label: 'Gamma', panel: <p>Contenu C</p> },
];

function TabsHarness() {
  const [value, setValue] = useState('a');
  return <Tabs label="Sections" tabs={TABS} value={value} onChange={setValue} />;
}

describe('Tabs', () => {
  it('expose tablist, tab et tabpanel reliés', () => {
    render(<TabsHarness />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeTruthy();
    const tab = screen.getByRole('tab', { name: 'Alpha' });
    expect(tab.getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Beta' }).getAttribute('aria-selected')).toBe('false');
    const panel = screen.getByRole('tabpanel', { name: 'Alpha' });
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(screen.getByText('Contenu A')).toBeTruthy();
    expect(screen.queryByText('Contenu B')).toBeNull();
  });

  it("n'a qu'un onglet dans l'ordre de tabulation", () => {
    render(<TabsHarness />);
    expect(screen.getByRole('tab', { name: 'Alpha' }).tabIndex).toBe(0);
    expect(screen.getByRole('tab', { name: 'Beta' }).tabIndex).toBe(-1);
  });

  it("un clic change d'onglet", async () => {
    render(<TabsHarness />);
    await userEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByText('Contenu B')).toBeTruthy();
  });

  it('les flèches, Début et Fin déplacent la sélection et le focus', async () => {
    render(<TabsHarness />);
    screen.getByRole('tab', { name: 'Alpha' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByText('Contenu B')).toBeTruthy();
    await userEvent.keyboard('{End}');
    expect(screen.getByText('Contenu C')).toBeTruthy();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('Contenu A')).toBeTruthy();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByText('Contenu C')).toBeTruthy();
    await userEvent.keyboard('{Home}');
    expect(screen.getByText('Contenu A')).toBeTruthy();
  });
});

describe('TextArea', () => {
  it('relie libellé, compteur et erreur, et renvoie le texte', async () => {
    const onChange = vi.fn();
    render(
      <TextArea label="Note" value="" counter="0 / 10" error="Trop court" onChange={onChange} />,
    );
    const area = screen.getByLabelText('Note');
    expect(area.getAttribute('aria-invalid')).toBe('true');
    const described = (area.getAttribute('aria-describedby') ?? '').split(' ');
    expect(described).toContain(screen.getByRole('alert').id);
    expect(described).toContain(screen.getByText('0 / 10').id);
    await userEvent.type(area, 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('applique maxLength', async () => {
    function Harness() {
      const [v, setV] = useState('');
      return <TextArea label="Note" value={v} maxLength={3} onChange={setV} />;
    }
    render(<Harness />);
    const area = screen.getByLabelText<HTMLTextAreaElement>('Note');
    expect(area.maxLength).toBe(3);
    await userEvent.type(area, 'abcdef');
    expect(area.value).toBe('abc');
  });

  it('sans erreur ni compteur, rien à annoncer', () => {
    render(<TextArea label="Note" value="" onChange={() => undefined} />);
    const area = screen.getByLabelText('Note');
    expect(area.getAttribute('aria-invalid')).toBe('false');
    expect(area.getAttribute('aria-describedby')).toBeNull();
  });
});

describe('ChoiceGroup', () => {
  const options = [
    { value: 'f', label: 'Femme' },
    { value: 'h', label: 'Homme' },
  ];
  it('est un groupe nommé à sélection exclusive', async () => {
    function Harness() {
      const [v, setV] = useState<string | undefined>('f');
      return <ChoiceGroup legend="Morphologie" options={options} value={v} onChange={setV} />;
    }
    render(<Harness />);
    expect(screen.getByRole('group', { name: 'Morphologie' })).toBeTruthy();
    const femme = screen.getByRole<HTMLInputElement>('radio', { name: 'Femme' });
    const homme = screen.getByRole<HTMLInputElement>('radio', { name: 'Homme' });
    expect(femme.checked).toBe(true);
    await userEvent.click(homme);
    expect(homme.checked).toBe(true);
    expect(femme.checked).toBe(false);
  });
});

describe('FileButton', () => {
  it('transmet le fichier choisi', () => {
    const onFile = vi.fn();
    render(
      <FileButton accept="image/png" onFile={onFile}>
        Importer
      </FileButton>,
    );
    const input = screen.getByTestId<HTMLInputElement>('ui-file-input');
    expect(input.accept).toBe('image/png');
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFile).toHaveBeenCalledWith(file);
  });

  it('le bouton ouvre le sélecteur', async () => {
    render(<FileButton onFile={() => undefined}>Importer</FileButton>);
    const input = screen.getByTestId<HTMLInputElement>('ui-file-input');
    const click = vi.spyOn(input, 'click');
    await userEvent.click(screen.getByRole('button', { name: 'Importer' }));
    expect(click).toHaveBeenCalled();
  });

  it('permet de rechoisir le même fichier', async () => {
    const onFile = vi.fn();
    render(<FileButton onFile={onFile}>Importer</FileButton>);
    const input = screen.getByTestId<HTMLInputElement>('ui-file-input');
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    await userEvent.upload(input, file);
    expect(input.value).toBe('');
    await userEvent.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(2);
  });
});

function KeepHarness() {
  const [value, setValue] = useState('a');
  const tabs = [
    { id: 'a', label: 'Alpha', panel: <input aria-label="Saisie A" /> },
    { id: 'b', label: 'Beta', panel: <input aria-label="Saisie B" /> },
  ];
  return <Tabs label="Sections" tabs={tabs} value={value} onChange={setValue} keepMounted />;
}

describe('Tabs keepMounted', () => {
  it('ne monte pas un panneau jamais visité', () => {
    render(<KeepHarness />);
    expect(screen.getByLabelText('Saisie A')).toBeTruthy();
    expect(screen.queryByLabelText('Saisie B', { selector: 'input' })).toBeNull();
  });

  it('garde monté et masqué un panneau visité, saisie conservée', async () => {
    render(<KeepHarness />);
    await userEvent.type(screen.getByLabelText('Saisie A'), 'abc');
    await userEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    const hidden = screen.getByLabelText('Saisie A', { selector: 'input' });
    expect(hidden.closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(true);
    await userEvent.click(screen.getByRole('tab', { name: 'Alpha' }));
    const back = screen.getByLabelText('Saisie A') as HTMLInputElement;
    expect(back.value).toBe('abc');
    expect(back.closest('[role="tabpanel"]')?.hasAttribute('hidden')).toBe(false);
  });

  it('laisse les rôles et attributs aria inchangés', async () => {
    render(<KeepHarness />);
    await userEvent.click(screen.getByRole('tab', { name: 'Beta' }));
    expect(screen.getByRole('tab', { name: 'Beta' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Alpha' }).getAttribute('aria-selected')).toBe('false');
    expect(screen.getByRole('tabpanel', { name: 'Beta' })).toBeTruthy();
    expect(screen.getAllByRole('tabpanel', { hidden: true })).toHaveLength(2);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppTabs, tabFromHash } from '../src/app-tabs.js';

// Le banc d'essai ne se résout que quand le test le décide : on observe le chargement différé.
const gate = vi.hoisted(() => {
  let release: () => void = () => undefined;
  const opened = new Promise<void>((resolve) => (release = resolve));
  return { opened, release };
});

vi.mock('../src/screens/pattern-studio/screen.js', () => ({
  PatternStudioScreen: () => (
    <div data-testid="pattern-screen">
      <input aria-label="Saisie patron" />
    </div>
  ),
}));
vi.mock('../src/screens/fabric-bench/screen.js', async () => {
  await gate.opened;
  return {
    FabricBenchScreen: () => (
      <div data-testid="bench-screen">
        <input aria-label="Saisie banc" />
      </div>
    ),
  };
});

beforeEach(() => window.history.replaceState(null, '', '/'));
afterEach(() => window.history.replaceState(null, '', '/'));

describe('chargement différé du banc d’essai', () => {
  it('affiche un message de chargement tant que le module n’est pas arrivé', async () => {
    // Premier test du fichier : le module différé est ensuite en cache, le portail reste ouvert.
    window.history.replaceState(null, '', '/#tissus');
    render(<AppTabs />);
    expect(screen.getByText('Chargement du banc d’essai…')).toBeTruthy();
    expect(screen.queryByTestId('bench-screen')).toBeNull();
    gate.release();
    expect(await screen.findByTestId('bench-screen')).toBeTruthy();
  });
});

describe('onglets du studio', () => {
  it('lit l’onglet dans le fragment d’adresse', () => {
    expect(tabFromHash('#tissus')).toBe('fabrics');
    expect(tabFromHash('')).toBe('pattern');
    expect(tabFromHash('#autre')).toBe('pattern');
  });

  it('ouvre le patron par défaut', () => {
    render(<AppTabs />);
    expect(screen.getByRole('tab', { name: 'Patron' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByTestId('pattern-screen')).toBeTruthy();
  });

  it('un clic change d’onglet et l’écrit dans l’adresse, puis revient au patron', async () => {
    gate.release();
    render(<AppTabs />);
    await userEvent.click(screen.getByRole('tab', { name: 'Tissus' }));
    expect(await screen.findByTestId('bench-screen')).toBeTruthy();
    expect(window.location.hash).toBe('#tissus');
    expect(
      screen.getByTestId('pattern-screen').closest('[role="tabpanel"]')?.hasAttribute('hidden'),
    ).toBe(true);

    await userEvent.click(screen.getByRole('tab', { name: 'Patron' }));
    expect(window.location.hash).toBe('');
    expect(screen.getByTestId('pattern-screen')).toBeTruthy();
  });

  it('conserve la saisie du banc après Patron puis Tissus', async () => {
    gate.release();
    window.history.replaceState(null, '', '/#tissus');
    render(<AppTabs />);
    await userEvent.type(await screen.findByLabelText('Saisie banc'), '42');
    await userEvent.click(screen.getByRole('tab', { name: 'Patron' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Tissus' }));
    expect((screen.getByLabelText('Saisie banc') as HTMLInputElement).value).toBe('42');
  });

  it('conserve la saisie du patron après Tissus puis Patron', async () => {
    gate.release();
    render(<AppTabs />);
    await userEvent.type(screen.getByLabelText('Saisie patron'), '90');
    await userEvent.click(screen.getByRole('tab', { name: 'Tissus' }));
    await screen.findByTestId('bench-screen');
    await userEvent.click(screen.getByRole('tab', { name: 'Patron' }));
    expect((screen.getByLabelText('Saisie patron') as HTMLInputElement).value).toBe('90');
  });

  it('un rechargement sur #tissus ouvre directement les tissus', async () => {
    gate.release();
    window.history.replaceState(null, '', '/#tissus');
    render(<AppTabs />);
    expect(screen.getByRole('tab', { name: 'Tissus' }).getAttribute('aria-selected')).toBe('true');
    expect(await screen.findByTestId('bench-screen')).toBeTruthy();
  });

  it('suit un changement manuel du fragment', async () => {
    gate.release();
    render(<AppTabs />);
    window.location.hash = '#tissus';
    expect(await screen.findByTestId('bench-screen')).toBeTruthy();
  });
});

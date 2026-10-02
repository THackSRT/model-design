import { COMMENT_MAX_LENGTH } from '@atelier/features';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FabricBenchScreen } from '../src/screens/fabric-bench/screen.js';

const saver = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock('../src/platform/download.js', () => ({ browserFileSaver: saver }));
vi.mock('../src/platform/cusick.js', () => ({ getCusickRunner: () => ({ run: vi.fn() }) }));

const POPLIN = {
  weightGPerM2: 120,
  thicknessMm: 0.2,
  stretchWarpPercent: 2,
  stretchWeftPercent: 3,
  bendingRigidityMicroNm: 6,
  frictionCoefficient: 0.35,
};

const SIMULATION = {
  fabric: POPLIN,
  drapeCoefficient: 0.5,
  converged: true,
  simulatedSteps: 100,
};

const report = (overrides: Record<string, unknown> = {}, estimated = POPLIN) =>
  JSON.stringify({
    schemaVersion: '1.0',
    createdAt: '2026-05-01T08:00:00Z',
    updatedAt: '2026-05-01T09:00:00Z',
    engineVersion: '0.0.0-autre',
    reviews: [
      {
        preset: 'cotton-poplin',
        verdict: 'validated',
        reviewedAt: '2026-05-01T09:00:00Z',
        estimated,
        comment: '<b>très</b> souple',
        ...overrides,
      },
    ],
  });

const user = () => userEvent.setup();
const field = (label: string) => screen.getByLabelText(label);
const fill = async (label: string, value: string) => {
  await userEvent.clear(field(label));
  await userEvent.type(field(label), value);
};
const upload = (text: string) =>
  userEvent.upload(
    screen.getByTestId('ui-file-input'),
    new File([text], 'rapport.json', { type: 'application/json' }),
  );
const exportButton = () => screen.getByRole('button', { name: 'Exporter le rapport' });
const weigh = async (massG: string) => {
  await fill('Masse de l’échantillon', massG);
  await fill('Aire de l’échantillon', '100000');
};

beforeEach(() => {
  saver.save.mockReset();
  render(<FabricBenchScreen confirm={() => true} />);
});

describe('banc d’essai des tissus : au repos', () => {
  it('liste les sept préréglages à revoir, sans export possible, panneau de drapé au repos', () => {
    const list = screen.getByRole('region', { name: 'Préréglages' });
    const buttons = within(list).getAllByRole('button');
    expect(buttons.map((b) => b.textContent)).toEqual([
      'Popeline de coton À revoir',
      'Wax À revoir',
      'Bazin À revoir',
      'Lin À revoir',
      'Denim À revoir',
      'Satin de soie À revoir',
      'Jersey À revoir',
    ]);
    expect(exportButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Revoyez au moins un préréglage/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Simuler' })).toHaveLength(2);
  });

  it('montre les conseils d’essai et, pour chaque grandeur, l’estimation et les bornes du contrat', () => {
    expect(screen.getByText(/au moins 0,1 m²/)).toBeTruthy();
    expect(screen.getAllByText(/repères tracés à 200 mm/).length).toBe(2);
    expect(screen.getAllByText(/plan incliné à 41,5°/).length).toBe(2);
    const row = screen.getByRole('row', { name: /Grammage/ });
    expect(row.textContent).toMatch(/120 g\/m²/);
    expect(row.textContent).toMatch(/De .* à .* g\/m²/);
    expect(screen.getByText(/Saisissez un essai complet/)).toBeTruthy();
  });

  it('la colonne de tolérance chiffre chaque grandeur : relative, ou relative avec plancher absolu', () => {
    expect(screen.getByRole('columnheader', { name: 'Tolérance' })).toBeTruthy();
    expect(screen.getByRole('row', { name: /Grammage/ }).textContent).toMatch(/± 10\s%/);
    expect(screen.getByRole('row', { name: /Épaisseur/ }).textContent).toMatch(
      /± 25\s%\s\(min\. 0,05 mm\)/,
    );
    expect(screen.getByRole('row', { name: /Frottement/ }).textContent).toMatch(/\(min\. 0,1\)/);
  });

  it('un autre préréglage montre sa propre estimation', async () => {
    await user().click(screen.getByRole('button', { name: /Wax/ }));
    expect(screen.getByRole('row', { name: /Grammage/ }).textContent).toMatch(/180 g\/m²/);
  });
});

describe('banc d’essai des tissus : essais saisis', () => {
  it('essai conforme : écart, conformité, verdict proposé et marque « modifié »', async () => {
    await weigh('12');
    const row = screen.getByRole('row', { name: /Grammage/ });
    expect(row.textContent).toMatch(/Conforme/);
    expect(row.textContent).toMatch(/120 g\/m².*120 g\/m²/);
    expect(screen.getByText('Verdict proposé : Validé')).toBeTruthy();
    expect(screen.getByRole('button', { name: /Popeline de coton/ }).textContent).toMatch(
      /modifié/,
    );
    expect(exportButton().hasAttribute('disabled')).toBe(false);
  });

  it('essai hors tolérance : verdict proposé « Corrigé », écart signalé', async () => {
    await weigh('24');
    const row = screen.getByRole('row', { name: /Grammage/ });
    expect(row.textContent).toMatch(/Hors tolérance/);
    expect(row.textContent).toMatch(/\+100/);
    expect(screen.getByText('Verdict proposé : Corrigé')).toBeTruthy();
  });

  it('champ hors bornes : l’erreur donne les bornes du contrat, avec leur unité', async () => {
    await fill('Masse de l’échantillon', '5000');
    const weighing = within(screen.getByRole('region', { name: 'Pesée' }));
    expect(weighing.getAllByRole('alert')[0]?.textContent).toMatch(/Plus de 0 et au plus 1\D000 g/);
  });

  it('champ vidé après essai commencé : valeur obligatoire', async () => {
    await fill('Masse de l’échantillon', '12');
    expect(screen.getByRole('alert').textContent).toBe('Valeur obligatoire');
  });

  it('distance sous charge plus courte que celle au repos : erreur loaded-shorter', async () => {
    const warp = within(screen.getByRole('region', { name: 'Allongement chaîne' }));
    await userEvent.type(warp.getByLabelText('Largeur de la bande'), '50');
    await userEvent.type(warp.getByLabelText('Distance entre repères au repos'), '200');
    await userEvent.type(warp.getByLabelText('Distance entre repères sous charge'), '150');
    await userEvent.type(warp.getByLabelText('Masse suspendue'), '1000');
    expect(warp.getByRole('alert').textContent).toMatch(/plus courte que la distance au repos/);
  });

  it('allongement extrapolé : signalé avec le conseil de refaire l’essai', async () => {
    const warp = within(screen.getByRole('region', { name: 'Allongement chaîne' }));
    await userEvent.type(warp.getByLabelText('Largeur de la bande'), '50');
    await userEvent.type(warp.getByLabelText('Distance entre repères au repos'), '200');
    await userEvent.type(warp.getByLabelText('Distance entre repères sous charge'), '210');
    await userEvent.type(warp.getByLabelText('Masse suspendue'), '5000');
    expect(screen.getByText(/Allongement chaîne extrapolé/)).toBeTruthy();
  });

  it('flexion sans pesée : grammage estimé signalé avec le conseil de peser', async () => {
    const bending = within(screen.getByRole('region', { name: 'Flexion chaîne' }));
    await userEvent.type(bending.getByLabelText('Porte-à-faux 1'), '60');
    expect(screen.getByText(/repose sur le grammage estimé/)).toBeTruthy();
    expect(bending.getByLabelText('Porte-à-faux 2')).toBeTruthy();
  });

  it('une série propose une lecture de plus à chaque lecture saisie', async () => {
    const thickness = within(screen.getByRole('region', { name: 'Épaisseur' }));
    expect(thickness.queryByLabelText('Lecture 2')).toBeNull();
    await userEvent.type(thickness.getByLabelText('Lecture 1'), '0.2');
    expect(thickness.getByLabelText('Lecture 2')).toBeTruthy();
  });

  it('surface d’appui : choix parmi les valeurs du contrat', async () => {
    await userEvent.click(screen.getByRole('radio', { name: 'Peau synthétique' }));
    expect(
      (screen.getByRole('radio', { name: 'Peau synthétique' }) as HTMLInputElement).checked,
    ).toBe(true);
  });
});

describe('banc d’essai des tissus : verdict et commentaire', () => {
  it('verdict corrigé : valeurs préremplies, erreurs de bornes, export bloqué', async () => {
    await weigh('24');
    await userEvent.click(screen.getByRole('radio', { name: 'Corrigé' }));
    const corrected = within(screen.getByRole('group', { name: 'Valeurs corrigées' }));
    expect((corrected.getByLabelText('Grammage') as HTMLInputElement).value).toBe('240');
    await userEvent.clear(corrected.getByLabelText('Grammage'));
    expect(corrected.getByRole('alert').textContent).toBe('Valeur obligatoire');
    await userEvent.type(corrected.getByLabelText('Grammage'), '99999999');
    expect(corrected.getByRole('alert').textContent).toMatch(/^Entre /);
    expect(exportButton().hasAttribute('disabled')).toBe(true);
  });

  it('commentaire trop long : erreur, compteur et export bloqué', async () => {
    const comment = field('Commentaire');
    fireEvent.change(comment, { target: { value: 'a'.repeat(COMMENT_MAX_LENGTH + 1) } });
    expect(screen.getByRole('alert').textContent).toMatch(/Commentaire trop long/);
    expect(
      screen.getByText(new RegExp(`${COMMENT_MAX_LENGTH + 1}.*/.*${COMMENT_MAX_LENGTH}`)),
    ).toBeTruthy();
    expect(exportButton().hasAttribute('disabled')).toBe(true);
    expect(screen.getByText(/Ni nom ni donnée de client/)).toBeTruthy();
  });

  it('le commentaire se compte en points de code, pas en unités UTF-16', () => {
    fireEvent.change(field('Commentaire'), { target: { value: '😀'.repeat(COMMENT_MAX_LENGTH) } });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('banc d’essai des tissus : rapport', () => {
  it('export : remet le rapport au port d’enregistrement', async () => {
    await weigh('12');
    await userEvent.click(exportButton());
    expect(saver.save).toHaveBeenCalledOnce();
    const [blob, name] = saver.save.mock.calls[0] as [Blob, string];
    expect(name).toMatch(/^rapport-tissus-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(await blob.text()).reviews[0].preset).toBe('cotton-poplin');
  });

  it('import refusé : message traduit, état intact', async () => {
    await weigh('12');
    await upload('ceci n’est pas du JSON');
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Ce fichier n’est pas un rapport JSON.',
    );
    expect((field('Masse de l’échantillon') as HTMLInputElement).value).toBe('12');
  });

  it('import trop volumineux : refusé sans lire tout le fichier', async () => {
    await upload(' '.repeat(262_144 + 10));
    expect((await screen.findByRole('alert')).textContent).toMatch(/Fichier trop volumineux/);
  });

  it('import avec avis : simulations écartées, estimation changée, commentaire affiché en texte', async () => {
    const changed = { ...POPLIN, weightGPerM2: 121 };
    await upload(report({ simulatedDrape: { estimated: SIMULATION } }, changed));
    expect(await screen.findByText('Rapport importé.')).toBeTruthy();
    expect(screen.getByText(/essais de drapé simulés ont été écartés/)).toBeTruthy();
    expect(screen.getByText(/Popeline de coton : l’estimation a changé/)).toBeTruthy();
    const comment = field('Commentaire') as HTMLTextAreaElement;
    expect(comment.value).toBe('<b>très</b> souple');
    expect(document.querySelector('b')).toBeNull();
    expect(screen.getByRole('button', { name: /Popeline de coton/ }).textContent).toMatch(
      /À revoir.*modifié/,
    );
  });

  it('import conforme : le verdict du rapport est repris', async () => {
    await upload(report());
    await waitFor(() => expect(screen.getByText('Rapport importé.')).toBeTruthy());
    expect(screen.getByRole('button', { name: /Popeline de coton/ }).textContent).toMatch(/Validé/);
    expect(exportButton().hasAttribute('disabled')).toBe(false);
  });
});

describe('banc d’essai des tissus : avertissement avant de quitter', () => {
  const leave = () => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  };

  it('armé seulement tant que des modifications ne sont pas exportées', async () => {
    expect(leave()).toBe(false);
    await weigh('12');
    expect(leave()).toBe(true);
    await userEvent.click(exportButton());
    expect(leave()).toBe(false);
  });
});

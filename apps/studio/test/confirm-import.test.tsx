import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FabricBenchScreen } from '../src/screens/fabric-bench/screen.js';

vi.mock('../src/platform/cusick.js', () => ({ getCusickRunner: () => ({ run: vi.fn() }) }));
vi.mock('../src/platform/download.js', () => ({ browserFileSaver: { save: vi.fn() } }));

const upload = () =>
  userEvent.upload(
    screen.getByTestId('ui-file-input'),
    new File(['pas du JSON'], 'rapport.json', { type: 'application/json' }),
  );
const dirty = () => {
  fireEvent.change(screen.getByLabelText('Masse de l’échantillon'), { target: { value: '12' } });
};
const failedImport = () => screen.queryByText('Ce fichier n’est pas un rapport JSON.');

describe('import d’un rapport avec des modifications non exportées', () => {
  it('rien de modifié : aucune question, le rapport est importé', async () => {
    const confirm = vi.fn(() => false);
    render(<FabricBenchScreen confirm={confirm} />);
    await upload();
    expect(await screen.findByText('Ce fichier n’est pas un rapport JSON.')).toBeTruthy();
    expect(confirm).not.toHaveBeenCalled();
  });

  it('modifié et refus : question traduite, rien n’est importé', async () => {
    const confirm = vi.fn(() => false);
    render(<FabricBenchScreen confirm={confirm} />);
    dirty();
    await upload();
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/modifications non exportées/));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(failedImport()).toBeNull();
  });

  it('modifié et accord : le rapport est importé', async () => {
    const confirm = vi.fn(() => true);
    render(<FabricBenchScreen confirm={confirm} />);
    dirty();
    await upload();
    expect(await screen.findByText('Ce fichier n’est pas un rapport JSON.')).toBeTruthy();
    expect(confirm).toHaveBeenCalledOnce();
  });
});

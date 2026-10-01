import type { CutPattern } from '@atelier/contracts-ts';
import { err, ok } from '@atelier/kernel';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ApiProblem, DesignsClient, ExportedFile } from '../src/api/designs-client.js';
import { type FileSaver, useCutPieces } from '../src/cut-pieces/use-cut-pieces.js';
import { cutPattern } from './cut-fixtures.js';

const problem: ApiProblem = { type: '/problems/allowance-on-fold', title: 'x', status: 422 };
const exported: ExportedFile = { blob: new Blob(['x']), fileName: 'straight-skirt-v1.pdf' };

function setup() {
  const designs = {
    cutPattern: vi.fn<DesignsClient['cutPattern']>(async () => ok(cutPattern)),
    exportFile: vi.fn<DesignsClient['exportFile']>(async () => ok(exported)),
  };
  const files: FileSaver = { save: vi.fn() };
  return { designs, files, deps: { designs: designs as unknown as DesignsClient, files } };
}
const ref = (versionNumber: number) => ({ designId: 'd1', versionNumber });

describe('modèle de vue des pièces de coupe', () => {
  it('sans version : au repos, aucun appel', () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useCutPieces(deps));
    expect(result.current.state.status).toBe('idle');
    expect(designs.cutPattern).not.toHaveBeenCalled();
  });

  it('une version prête déclenche un seul appel avec {} et rend la mise en page', async () => {
    const { deps, designs } = setup();
    const { result } = renderHook(() => useCutPieces(deps, ref(1)));
    expect(result.current.state.status).toBe('working');
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(designs.cutPattern).toHaveBeenCalledTimes(1);
    expect(designs.cutPattern).toHaveBeenCalledWith('d1', 1, {});
    expect(result.current.state.layout?.pieces).toHaveLength(2);
  });

  it('ignore la réponse périmée d’une version plus ancienne', async () => {
    const { deps, designs } = setup();
    type Answer = Awaited<ReturnType<DesignsClient['cutPattern']>>;
    const resolvers: Array<(r: Answer) => void> = [];
    designs.cutPattern.mockImplementation(() => new Promise((resolve) => resolvers.push(resolve)));
    const { result, rerender } = renderHook(({ n }) => useCutPieces(deps, ref(n)), {
      initialProps: { n: 1 },
    });
    rerender({ n: 2 });
    const single: CutPattern = { ...cutPattern, pieces: [cutPattern.pieces[0]] };
    await act(async () => resolvers[1]?.(ok(single)));
    await act(async () => resolvers[0]?.(ok(cutPattern)));
    expect(result.current.state.layout?.pieces).toHaveLength(1);
  });

  it('échec : failed avec le problème', async () => {
    const { deps, designs } = setup();
    designs.cutPattern.mockResolvedValue(err(problem));
    const { result } = renderHook(() => useCutPieces(deps, ref(1)));
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    expect(result.current.state.problem).toEqual(problem);
  });

  it('download enregistre le fichier avec le nom du service', async () => {
    const { deps, designs, files } = setup();
    const { result } = renderHook(() => useCutPieces(deps, ref(1)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.download('pdf-a4-tiled'));
    expect(result.current.state.exports['pdf-a4-tiled'].status).toBe('working');
    await waitFor(() => expect(result.current.state.exports['pdf-a4-tiled'].status).toBe('idle'));
    expect(designs.exportFile).toHaveBeenCalledWith('d1', 1, { format: 'pdf-a4-tiled' });
    expect(files.save).toHaveBeenCalledWith(exported.blob, 'straight-skirt-v1.pdf');
  });

  it('export en échec : failed avec le problème, rien n’est enregistré', async () => {
    const { deps, designs, files } = setup();
    const unavailable = { ...problem, type: '/problems/export-format-unavailable' };
    designs.exportFile.mockResolvedValue(err(unavailable));
    const { result } = renderHook(() => useCutPieces(deps, ref(1)));
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    act(() => result.current.actions.download('dxf-aama'));
    await waitFor(() => expect(result.current.state.exports['dxf-aama'].status).toBe('failed'));
    expect(result.current.state.exports['dxf-aama'].problem).toEqual(unavailable);
    expect(files.save).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';
import type { CusickRunner } from '../src/fabric-bench/cusick-runner.js';
import type { BenchDraft } from '../src/fabric-bench/measurement-draft.js';
import { useFabricBench } from '../src/fabric-bench/use-fabric-bench.js';
import { FIXED_NOW } from './fabric-bench-fixtures.js';

export const POPLIN = 'cotton-poplin';

export function setup(cusick?: CusickRunner) {
  const saver = { save: vi.fn<(blob: Blob, name: string) => void>() };
  const { result } = renderHook(() => useFabricBench({ saver, now: () => FIXED_NOW, cusick }));
  const poplin = () => {
    const found = result.current.state.presets.find((p) => p.preset === POPLIN);
    if (!found) throw new Error('préréglage absent');
    return found;
  };
  const fill = (draft: BenchDraft) =>
    act(() => {
      for (const [path, value] of Object.entries(draft)) {
        result.current.actions.setField(POPLIN, path, value);
      }
    });
  return { result, saver, poplin, fill };
}

export const runnerOf = (run: CusickRunner['run']): CusickRunner => ({ run });
export const lastSaved = async (saver: ReturnType<typeof setup>['saver']) => {
  const [blob, name] = saver.save.mock.calls.at(-1) ?? [];
  if (!blob || !name) throw new Error('aucun enregistrement');
  return { blob, name, text: await blob.text() };
};

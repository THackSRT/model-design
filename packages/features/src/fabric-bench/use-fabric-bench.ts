import { useMemo, useRef, useState } from 'react';

import {
  createBenchActions,
  type BenchStore,
  type FabricBenchActions,
  type FabricBenchDeps,
} from './bench-actions.js';
import { type BenchCore, initialCore } from './bench-state.js';

export type { FabricBenchActions, FabricBenchDeps } from './bench-actions.js';

export interface FabricBenchState extends BenchCore {
  /** Faux sans `CusickRunner` : l'écran masque les essais de drapé simulés. */
  drapeTestAvailable: boolean;
}

/**
 * Banc d'essai des tissus : une revue par préréglage (valeurs estimées, saisie, grandeurs déduites, écarts,
 * verdict, valeurs corrigées, commentaire, essais de drapé), export et import d'un rapport. Rien n'est gardé
 * en local (ADR 0015) : `dirty` dit si des modifications ne sont pas exportées.
 */
export function useFabricBench(deps: FabricBenchDeps): {
  state: FabricBenchState;
  actions: FabricBenchActions;
} {
  const [core, setCore] = useState<BenchCore>(() => initialCore(deps.now()));
  const latest = useRef<BenchCore>(core);
  const { saver, now, cusick } = deps;

  const actions = useMemo(() => {
    const store: BenchStore = {
      get: () => latest.current,
      set: (next) => {
        latest.current = next;
        setCore(next);
      },
    };
    return createBenchActions(store, { saver, now, cusick });
  }, [saver, now, cusick]);

  const state = useMemo(
    () => ({ ...core, drapeTestAvailable: cusick !== undefined }),
    [core, cusick],
  );
  return { state, actions };
}

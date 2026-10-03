import type { CreateDesignVersionRequest } from '@atelier/contracts-ts';
import { useCallback, useRef, useState } from 'react';
import { AVATAR_FIT_OPTIONS, initialMannequinState, type MannequinState } from './fitter.js';
import {
  generate,
  type GenerationResult,
  type PatternStudioDeps,
  type StudioSession,
} from './generate.js';

export interface PatronRun {
  pending: boolean;
  result?: GenerationResult;
}

const NETWORK_PROBLEM = { type: '/problems/network', title: 'network', status: 0 };

/**
 * Lance le patron (service) et l'ajustement du mannequin (Web Worker) en parallèle.
 * Seule la dernière demande compte : la réponse d'une demande périmée est ignorée.
 */
export function useStudioRun(deps: PatternStudioDeps) {
  const [patron, setPatron] = useState<PatronRun>({ pending: false });
  const [body, setBody] = useState<MannequinState>(initialMannequinState);
  const latest = useRef(0);
  const session = useRef<StudioSession>({ designIds: {} });
  const epoch = useRef(0);

  const run = useCallback(
    (request: CreateDesignVersionRequest, onCreated?: () => void) => {
      latest.current += 1;
      const id = latest.current;
      const isLatest = () => id === latest.current;
      const patronEpoch = epoch.current;
      const isPatronLatest = () => isLatest() && patronEpoch === epoch.current;
      setPatron((p) => ({ ...p, pending: true }));
      setBody((b) => ({ status: 'fitting', mannequin: b.mannequin }));
      deps.mannequin.fit(request.measurements, AVATAR_FIT_OPTIONS).then(
        (mannequin) => isLatest() && setBody({ status: 'ready', mannequin }),
        () => isLatest() && setBody({ status: 'failed' }),
      );
      generate(deps.designs, session.current, request, deps.designName)
        .catch((): GenerationResult => ({ problem: NETWORK_PROBLEM }))
        .then((result) => {
          if (!isPatronLatest()) return;
          setPatron({ pending: false, result });
          if (result.version) onCreated?.();
        });
    },
    [deps],
  );
  /** Efface le patron affiché (il ne correspond plus à la saisie) ; le mannequin reste. */
  const clearPatron = useCallback(() => {
    epoch.current += 1;
    setPatron({ pending: false });
  }, []);
  return { patron, body, run, clearPatron };
}

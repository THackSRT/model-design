import type { CreateDesignVersionRequest } from '@atelier/contracts-ts';
import { useCallback, useRef, useState } from 'react';
import { initialMannequinState, type MannequinState } from './fitter.js';
import { generate, type GenerationResult, type PatternStudioDeps } from './generate.js';

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
  const session = useRef({});

  const run = useCallback(
    (request: CreateDesignVersionRequest) => {
      latest.current += 1;
      const id = latest.current;
      const isLatest = () => id === latest.current;
      setPatron((p) => ({ ...p, pending: true }));
      setBody((b) => ({ status: 'fitting', mannequin: b.mannequin }));
      deps.mannequin.fit(request.measurements).then(
        (mannequin) => isLatest() && setBody({ status: 'ready', mannequin }),
        () => isLatest() && setBody({ status: 'failed' }),
      );
      generate(deps.designs, session.current, request)
        .catch((): GenerationResult => ({ problem: NETWORK_PROBLEM }))
        .then((result) => isLatest() && setPatron({ pending: false, result }));
    },
    [deps],
  );
  return { patron, body, run };
}

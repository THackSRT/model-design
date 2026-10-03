import { useEffect, useRef, useState } from 'react';
import type {
  PatternStudioActions,
  PatternStudioState,
} from '../pattern-studio/use-pattern-studio.js';
import type {
  DesignHistoryActions,
  DesignHistoryDeps,
  DesignHistoryState,
} from './history-state.js';
import { STALE_PROBLEM } from './history-state.js';
import { useDesignHistory } from './use-design-history.js';

/** Dernier modèle calculé de la session : il survit à l'effacement du patron par une reprise. */
export interface SessionModel {
  designId: string;
  versionNumber: number;
}

export function useSessionModel(
  designId?: string,
  versionNumber?: number,
): SessionModel | undefined {
  const [model, setModel] = useState<SessionModel>();
  const changed = model?.designId !== designId || model?.versionNumber !== versionNumber;
  if (designId && versionNumber && changed) setModel({ designId, versionNumber });
  return model;
}

/**
 * Issue d'une reprise : `applied` (formulaire remplacé), `declined` (refus de la confirmation, rien ne change),
 * `superseded` (un calcul a été lancé pendant la lecture : la reprise est abandonnée), `stale` (le modèle a changé
 * pendant la lecture), `failed` (lecture en échec : voir `state.resume.problem`).
 */
export type ResumeOutcome = 'applied' | 'declined' | 'superseded' | 'stale' | 'failed';

export interface StudioHistoryActions extends Pick<
  DesignHistoryActions,
  'loadMore' | 'compare' | 'clearComparison'
> {
  resume(versionNumber: number): Promise<ResumeOutcome>;
}

type Studio = { state: PatternStudioState; actions: PatternStudioActions };

/**
 * Historique du modèle de la session branché sur le studio. Reprendre : lit d'abord la version, puis demande
 * confirmation sur la saisie COURANTE (`confirm(numéro)`, vrai pour continuer) si elle a des modifications non
 * calculées, puis applique le formulaire. Un calcul lancé pendant la lecture abandonne la reprise.
 */
export function useStudioHistory(
  deps: DesignHistoryDeps,
  studio: Studio,
  confirm: (versionNumber: number) => boolean,
): { state: DesignHistoryState; actions: StudioHistoryActions; currentNumber?: number } {
  const { designId, versionNumber } = studio.state;
  const model = useSessionModel(designId, versionNumber);
  const history = useDesignHistory(deps, model ?? {});
  const latest = useRef({ studio, confirm });
  useEffect(() => {
    latest.current = { studio, confirm };
  });
  const { resume: readVersion, ...others } = history.actions;
  const resume = async (number: number): Promise<ResumeOutcome> => {
    const started = latest.current.studio.state;
    const result = await readVersion(number, started.form);
    if (result.isErr()) return result.error.type === STALE_PROBLEM.type ? 'stale' : 'failed';
    const now = latest.current;
    if (now.studio.state.runs !== started.runs) return 'superseded';
    if (now.studio.state.dirty && !now.confirm(number)) return 'declined';
    now.studio.actions.applyForm(result.value);
    return 'applied';
  };
  return {
    state: history.state,
    actions: {
      loadMore: others.loadMore,
      compare: others.compare,
      clearComparison: others.clearComparison,
      resume,
    },
    ...(model ? { currentNumber: model.versionNumber } : {}),
  };
}

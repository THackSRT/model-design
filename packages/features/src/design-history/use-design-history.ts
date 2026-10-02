import { err, ok, type Result } from '@atelier/kernel';
import {
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import type { StudioForm } from '../pattern-studio/form.js';
import {
  type ComparisonState,
  type DesignHistoryActions,
  type DesignHistoryDeps,
  type DesignHistoryState,
  HISTORY_PAGE_SIZE,
  type HistoryModelRef,
  initialHistory,
  type Internal,
  mergeVersions,
  NETWORK_PROBLEM,
  STALE_PROBLEM,
  readComparison,
  type ResumeState,
  safely,
} from './history-state.js';
import { versionToForm } from './version-to-form.js';

type SetInternal = Dispatch<SetStateAction<Internal>>;

/** Compteur qui change avec le modèle : une réponse d'un autre modèle est ignorée. */
function useModelEpoch(designs: DesignsClient, designId: string | undefined, set: SetInternal) {
  const epoch = useRef(0);
  useEffect(() => {
    epoch.current += 1;
    set(initialHistory());
    return () => {
      epoch.current += 1;
    };
  }, [designs, designId, set]);
  return epoch;
}

/** Première page, relue quand le modèle ou son numéro de version change ; seule la dernière lecture compte. */
function useFirstPage(
  designs: DesignsClient,
  model: HistoryModelRef,
  set: SetInternal,
  listEpoch: MutableRefObject<number>,
) {
  const { designId, versionNumber } = model;
  useEffect(() => {
    if (designId === undefined) return undefined;
    listEpoch.current += 1;
    const mine = listEpoch.current;
    set((s) => ({ ...s, status: 'loading', loadingMore: false, problem: undefined }));
    void safely(designs.listVersions(designId, { limit: HISTORY_PAGE_SIZE })).then((result) => {
      if (mine !== listEpoch.current) return;
      set((s) =>
        result.isOk()
          ? {
              ...s,
              status: 'ready',
              versions: result.value.items,
              hasMore: result.value.nextCursor !== undefined,
              nextCursor: result.value.nextCursor,
            }
          : { ...s, status: 'failed', problem: result.error },
      );
    });
    return () => {
      listEpoch.current += 1;
    };
  }, [designs, designId, versionNumber, set, listEpoch]);
}

interface ListContext {
  designs: DesignsClient;
  designId: string | undefined;
  set: SetInternal;
  listEpoch: MutableRefObject<number>;
}

function useLoadMore({ designs, designId, set, listEpoch }: ListContext, internal: Internal) {
  const { nextCursor: cursor, status, loadingMore } = internal;
  return useCallback(() => {
    if (designId === undefined || cursor === undefined) return;
    if (status !== 'ready' || loadingMore) return;
    const mine = listEpoch.current;
    set((s) => ({ ...s, loadingMore: true, problem: undefined }));
    void safely(designs.listVersions(designId, { cursor, limit: HISTORY_PAGE_SIZE })).then(
      (result) => {
        if (mine !== listEpoch.current) return;
        set((s) =>
          result.isOk()
            ? {
                ...s,
                loadingMore: false,
                versions: mergeVersions(s.versions, result.value.items),
                hasMore: result.value.nextCursor !== undefined,
                nextCursor: result.value.nextCursor,
              }
            : { ...s, loadingMore: false, problem: result.error },
        );
      },
    );
  }, [designs, designId, cursor, status, loadingMore, set, listEpoch]);
}

function useResume(
  designs: DesignsClient,
  designId: string | undefined,
  set: SetInternal,
  modelEpoch: MutableRefObject<number>,
) {
  return useCallback(
    async (number: number, base?: StudioForm): Promise<Result<StudioForm, ApiProblem>> => {
      if (designId === undefined) return err(NETWORK_PROBLEM);
      const mine = modelEpoch.current;
      const setResume = (resume: ResumeState) => {
        if (mine === modelEpoch.current) set((s) => ({ ...s, resume }));
      };
      setResume({ status: 'working', versionNumber: number });
      const version = await safely(designs.getVersion(designId, number));
      if (mine !== modelEpoch.current) return err(STALE_PROBLEM);
      if (version.isErr()) {
        setResume({ status: 'failed', versionNumber: number, problem: version.error });
        return err(version.error);
      }
      setResume({ status: 'idle' });
      return ok(versionToForm(version.value, base));
    },
    [designs, designId, set, modelEpoch],
  );
}

function useCompare(
  designs: DesignsClient,
  designId: string | undefined,
  set: SetInternal,
  modelEpoch: MutableRefObject<number>,
) {
  const compareEpoch = useRef(0);
  const compare = useCallback(
    (fromNumber: number, toNumber: number) => {
      if (designId === undefined) return;
      const mine = modelEpoch.current;
      compareEpoch.current += 1;
      const request = compareEpoch.current;
      const setComparison = (comparison: ComparisonState) => {
        if (mine !== modelEpoch.current || request !== compareEpoch.current) return;
        set((s) => ({ ...s, comparison }));
      };
      setComparison({ status: 'working' });
      void readComparison(designs, designId, fromNumber, toNumber).then((result) =>
        setComparison(
          result.isOk()
            ? { status: 'ready', result: result.value }
            : { status: 'failed', problem: result.error },
        ),
      );
    },
    [designs, designId, set, modelEpoch],
  );
  const clearComparison = useCallback(() => {
    compareEpoch.current += 1;
    set((s) => ({ ...s, comparison: { status: 'idle' } }));
  }, [set]);
  return { compare, clearComparison };
}

/**
 * Historique du modèle courant de la session : liste paginée des versions (rechargée à chaque nouvelle
 * version du studio), reprise d'une version dans le formulaire, comparaison de deux versions.
 * Les versions portent les mesures d'un client : rien n'est écrit dans le stockage du navigateur, tout
 * l'état est en mémoire et vidé au changement de modèle.
 */
export function useDesignHistory(
  deps: DesignHistoryDeps,
  model: HistoryModelRef = {},
): { state: DesignHistoryState; actions: DesignHistoryActions } {
  const { designs } = deps;
  const [internal, set] = useState<Internal>(initialHistory);
  const listEpoch = useRef(0);
  const modelEpoch = useModelEpoch(designs, model.designId, set);
  useFirstPage(designs, model, set, listEpoch);
  const loadMore = useLoadMore({ designs, designId: model.designId, set, listEpoch }, internal);
  const resume = useResume(designs, model.designId, set, modelEpoch);
  const { compare, clearComparison } = useCompare(designs, model.designId, set, modelEpoch);
  const state: DesignHistoryState = {
    status: internal.status,
    versions: internal.versions,
    hasMore: internal.hasMore,
    loadingMore: internal.loadingMore,
    ...(internal.problem ? { problem: internal.problem } : {}),
    resume: internal.resume,
    comparison: internal.comparison,
  };
  return { state, actions: { loadMore, resume, compare, clearComparison } };
}

import type { DesignVersionSummary } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import type { StudioForm } from '../pattern-studio/form.js';
import { buildComparison, type VersionComparison } from './compare.js';

export interface DesignHistoryDeps {
  designs: DesignsClient;
}

/** Version du modèle courant de la session : `designId` et `versionNumber` de l'état du studio. */
export interface HistoryModelRef {
  designId?: string;
  versionNumber?: number;
}

/** Taille d'une page de la liste (le service accepte 1 à 100). */
export const HISTORY_PAGE_SIZE = 20;

export interface ResumeState {
  status: 'idle' | 'working' | 'failed';
  /** Version en cours de reprise ou en échec. */
  versionNumber?: number;
  problem?: ApiProblem;
}

export interface ComparisonState {
  status: 'idle' | 'working' | 'ready' | 'failed';
  result?: VersionComparison;
  problem?: ApiProblem;
}

export interface DesignHistoryState {
  /** Première page : `idle` sans modèle, `loading` pendant (re)chargement, `failed` si elle n'a pas pu être lue. */
  status: 'idle' | 'loading' | 'ready' | 'failed';
  /** Résumés (sans mesures), la plus récente d'abord. */
  versions: DesignVersionSummary[];
  /** Il reste des versions plus anciennes : `loadMore` en lit la page. */
  hasMore: boolean;
  loadingMore: boolean;
  /** Échec de lecture de la liste (première page ou page suivante). */
  problem?: ApiProblem;
  resume: ResumeState;
  comparison: ComparisonState;
}

export interface DesignHistoryActions {
  /** Lit la page suivante (versions plus anciennes) ; sans effet s'il n'y en a pas ou si une lecture est en cours. */
  loadMore(): void;
  /**
   * Charge la version `versionNumber` et rend le formulaire qui la redonne (`base` : saisie à compléter,
   * par défaut le formulaire initial). Le studio applique ce formulaire ; rien n'est gardé ici.
   */
  resume(versionNumber: number, base?: StudioForm): Promise<Result<StudioForm, ApiProblem>>;
  /** Compare `fromNumber` (référence) à `toNumber` : entrées du service, aires et périmètres calculés ici. */
  compare(fromNumber: number, toNumber: number): void;
  clearComparison(): void;
}

/** État interne : l'état exposé plus le curseur de la page suivante (opaque, non exposé). */
export interface Internal extends DesignHistoryState {
  nextCursor?: string;
}

export const initialHistory = (): Internal => ({
  status: 'idle',
  versions: [],
  hasMore: false,
  loadingMore: false,
  resume: { status: 'idle' },
  comparison: { status: 'idle' },
});

export const NETWORK_PROBLEM: ApiProblem = {
  type: '/problems/network',
  title: 'network',
  status: 0,
};

/** Rendu par `resume` quand le modèle a changé pendant la lecture de la version : rien ne doit être appliqué. */
export const STALE_PROBLEM: ApiProblem = { type: '/problems/stale', title: 'stale', status: 0 };

/** Ajoute une page ; un numéro déjà connu n'est pas repris deux fois. */
export function mergeVersions(
  known: DesignVersionSummary[],
  items: DesignVersionSummary[],
): DesignVersionSummary[] {
  const seen = new Set(known.map((v) => v.number));
  return [...known, ...items.filter((v) => !seen.has(v.number))];
}

/** Une promesse qui rejette (client mal branché) devient un problème réseau. */
export async function safely<T>(
  call: Promise<Result<T, ApiProblem>>,
): Promise<Result<T, ApiProblem>> {
  try {
    return await call;
  } catch {
    return err(NETWORK_PROBLEM);
  }
}

/** Trois lectures en parallèle : les différences d'entrées et les deux versions (pour la géométrie). */
export async function readComparison(
  designs: DesignsClient,
  designId: string,
  fromNumber: number,
  toNumber: number,
): Promise<Result<VersionComparison, ApiProblem>> {
  const [changes, from, to] = await Promise.all([
    safely(designs.getVersionChanges(designId, toNumber, fromNumber)),
    safely(designs.getVersion(designId, fromNumber)),
    safely(designs.getVersion(designId, toNumber)),
  ]);
  if (changes.isErr()) return err(changes.error);
  if (from.isErr()) return err(from.error);
  if (to.isErr()) return err(to.error);
  return ok(buildComparison(changes.value, from.value, to.value));
}

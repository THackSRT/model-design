import { useEffect } from 'react';

type GuardTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>;

function warnBeforeUnload(event: BeforeUnloadEvent): void {
  // Le navigateur affiche son propre message : seul le refus par défaut est demandé.
  event.preventDefault();
  event.returnValue = '';
}

/** Arme l'avertissement du navigateur avant de quitter la page ; rend la fonction qui le désarme. */
export function armUnsavedGuard(target: GuardTarget = window): () => void {
  target.addEventListener('beforeunload', warnBeforeUnload);
  return () => target.removeEventListener('beforeunload', warnBeforeUnload);
}

/** Avertit avant de quitter la page tant que `dirty` est vrai (modifications non exportées). */
export function useUnsavedGuard(dirty: boolean): void {
  useEffect(() => (dirty ? armUnsavedGuard() : undefined), [dirty]);
}

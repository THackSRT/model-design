import { useState } from 'react';

export interface __Name__State {
  status: 'idle' | 'working' | 'ready' | 'failed';
}

export interface __Name__Actions {
  reset(): void;
}

/**
 * Modèle de vue de l'écran __name__ : données (clients typés par les contrats), état, actions.
 * Ajoutez `export * from './__name__/use-__name__.js'` dans packages/features/src/index.ts.
 */
export function use__Name__(): { state: __Name__State; actions: __Name__Actions } {
  const [status, setStatus] = useState<__Name__State['status']>('idle');
  return { state: { status }, actions: { reset: () => setStatus('idle') } };
}

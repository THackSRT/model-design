import type { __Name__Actions, __Name__State } from '@atelier/features';
import { Panel } from '@atelier/ui-web';

export interface __Name__ViewProps {
  state: __Name__State;
  actions: __Name__Actions;
}

/** Vue purement visuelle : composants de @atelier/ui-web et jetons de design uniquement. */
export function __Name__View({ state }: __Name__ViewProps) {
  return <Panel title="__Name__">{state.status}</Panel>;
}

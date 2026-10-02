import {
  createDesignsClient,
  useCutPieces,
  usePatternStudio,
  useStudioHistory,
} from '@atelier/features';
import { useMemo } from 'react';
import { browserFileSaver } from '../../platform/download.js';
import { getMannequinFitter } from '../../platform/mannequin.js';
import { garmentName, t } from '../../i18n/t.js';
import { PatternStudioView } from './view.js';

export interface PatternStudioScreenProps {
  /** Demande une confirmation à l'utilisateur ; `window.confirm` par défaut. */
  confirm?: (message: string) => boolean;
}

/** Branche le modèle de vue sur la vue : seul view.tsx change lors d'un redesign. */
export function PatternStudioScreen({
  confirm = (message) => window.confirm(message),
}: PatternStudioScreenProps) {
  const deps = useMemo(
    () => ({
      designs: createDesignsClient('/api/designs'),
      mannequin: getMannequinFitter(),
      designName: garmentName,
    }),
    [],
  );
  const studio = usePatternStudio(deps);
  const { designId, versionNumber } = studio.state;
  const version = designId && versionNumber ? { designId, versionNumber } : undefined;
  const cutPieces = useCutPieces({ designs: deps.designs, files: browserFileSaver }, version);
  const history = useStudioHistory({ designs: deps.designs }, studio, (number) =>
    confirm(t('history.confirmResume', { number })),
  );
  const historyProps = {
    state: history.state,
    actions: { ...history.actions, resume: (n: number) => void history.actions.resume(n) },
    currentNumber: history.currentNumber,
  };
  return <PatternStudioView {...studio} cutPieces={cutPieces} history={historyProps} />;
}

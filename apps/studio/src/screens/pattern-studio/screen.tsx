import { createDesignsClient, useCutPieces, usePatternStudio } from '@atelier/features';
import { useMemo } from 'react';
import { browserFileSaver } from '../../platform/download.js';
import { getMannequinFitter } from '../../platform/mannequin.js';
import { garmentName } from '../../i18n/t.js';
import { PatternStudioView } from './view.js';

/** Branche le modèle de vue sur la vue : seul view.tsx change lors d'un redesign. */
export function PatternStudioScreen() {
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
  return <PatternStudioView {...studio} cutPieces={cutPieces} />;
}

import { createDesignsClient, usePatternStudio } from '@atelier/features';
import { useMemo } from 'react';
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
  return <PatternStudioView {...usePatternStudio(deps)} />;
}

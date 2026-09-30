import { createDesignsClient, usePatternStudio } from '@atelier/features';
import { useMemo } from 'react';
import { loadMannequin } from '../../platform/mannequin.js';
import { PatternStudioView } from './view.js';

/** Branche le modèle de vue sur la vue : seul view.tsx change lors d'un redesign. */
export function PatternStudioScreen() {
  const deps = useMemo(() => ({ designs: createDesignsClient('/api/designs'), loadMannequin }), []);
  return <PatternStudioView {...usePatternStudio(deps)} />;
}

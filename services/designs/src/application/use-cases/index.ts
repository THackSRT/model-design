import type { Clock, IdGenerator } from '@atelier/kernel';
import type { DesignRepository } from '../ports/design-repository.js';
import type { Hasher } from '../ports/hasher.js';
import type { PatterningEngine } from '../ports/patterning-engine.js';
import { createDesign } from './create-design.js';
import { createDesignVersion } from './create-design-version.js';
import { getDesign, getDesignVersion } from './get-design.js';

export interface DesignsDeps {
  designs: DesignRepository;
  patterning: PatterningEngine;
  hasher: Hasher;
  ids: IdGenerator;
  clock: Clock;
}

/** Les cas d'usage du service, chacun déjà relié à ses dépendances. */
export function designsUseCases(deps: DesignsDeps) {
  return {
    createDesign: createDesign(deps),
    getDesign: getDesign(deps),
    createDesignVersion: createDesignVersion(deps),
    getDesignVersion: getDesignVersion(deps),
  };
}

export type DesignsUseCases = ReturnType<typeof designsUseCases>;

import type { Clock, IdGenerator } from '@atelier/kernel';
import type { DesignRepository } from '../ports/design-repository.js';
import type { DrapeRepository } from '../ports/drape-repository.js';
import type { ObjectStore } from '../ports/object-store.js';
import type { Hasher } from '../ports/hasher.js';
import type { ManufacturingEngine } from '../ports/manufacturing-engine.js';
import type { PatterningEngine } from '../ports/patterning-engine.js';
import { createDesign } from './create-design.js';
import { createDesignVersion } from './create-design-version.js';
import { exportVersion } from './export-version.js';
import { getDesign, getDesignVersion } from './get-design.js';
import { getVersionDrape } from './get-version-drape.js';
import { getVersionDrapeModel } from './get-version-drape-model.js';
import { getVersionCutPattern } from './get-version-cut-pattern.js';
import { getVersionChanges } from './get-version-changes.js';
import { listDesignVersions } from './list-design-versions.js';
import { recordDrapeOutcome } from './record-drape-outcome.js';
import { requestVersionDrape } from './request-version-drape.js';

export interface DesignsDeps {
  designs: DesignRepository;
  drapes: DrapeRepository;
  models: ObjectStore;
  patterning: PatterningEngine;
  manufacturing: ManufacturingEngine;
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
    listDesignVersions: listDesignVersions(deps),
    getVersionChanges: getVersionChanges(deps),
    getVersionCutPattern: getVersionCutPattern(deps),
    exportVersion: exportVersion(deps),
    requestVersionDrape: requestVersionDrape(deps),
    getVersionDrape: getVersionDrape(deps),
    getVersionDrapeModel: getVersionDrapeModel(deps),
    recordDrapeOutcome: recordDrapeOutcome(deps),
  };
}

export type DesignsUseCases = ReturnType<typeof designsUseCases>;

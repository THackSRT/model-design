// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.
import { avatarOptionsJsonSchema } from './avatar-options.js';
import { createDesignRequestJsonSchema } from './create-design-request.js';
import { createDesignVersionRequestJsonSchema } from './create-design-version-request.js';
import { cutPatternOptionsJsonSchema } from './cut-pattern-options.js';
import { designDocumentJsonSchema } from './design-document.js';
import { designExportRequestJsonSchema } from './design-export-request.js';
import { designOperationJsonSchema } from './design-operation.js';
import { designVersionChangesJsonSchema } from './design-version-changes.js';
import { designVersionPageJsonSchema } from './design-version-page.js';
import { designVersionSummaryJsonSchema } from './design-version-summary.js';
import { designVersionJsonSchema } from './design-version.js';
import { designJsonSchema } from './design.js';
import { drapeRequestJsonSchema } from './drape-request.js';
import { drapeJsonSchema } from './drape.js';
import { drapeJobJsonSchema } from './drape-job.js';
import { drapeResultJsonSchema } from './drape-result.js';
import { fabricBenchMeasurementsJsonSchema } from './fabric-bench-measurements.js';
import { fabricDerivedValuesJsonSchema } from './fabric-derived-values.js';
import { fabricPhysicsJsonSchema } from './fabric-physics.js';
import { fabricPresetReviewJsonSchema } from './fabric-preset-review.js';
import { fabricValidationReportJsonSchema } from './fabric-validation-report.js';
import { fabricJsonSchema } from './fabric.js';
import { cloudEventJsonSchema } from './cloud-event.js';
import { designVersionedJsonSchema } from './design-versioned.js';
import { drapeCompletedJsonSchema } from './drape-completed.js';
import { drapeFailedJsonSchema } from './drape-failed.js';
import { drapeRequestedJsonSchema } from './drape-requested.js';
import { garmentRequestJsonSchema } from './garment-request.js';
import { garmentSpecJsonSchema } from './garment-spec.js';
import { garmentTypeJsonSchema } from './garment-type.js';
import { cutPatternRequestJsonSchema } from './cut-pattern-request.js';
import { cutPatternJsonSchema } from './cut-pattern.js';
import { cuttingPlanRequestJsonSchema } from './cutting-plan-request.js';
import { cuttingPlanJsonSchema } from './cutting-plan.js';
import { exportRequestJsonSchema } from './export-request.js';
import { finishingOptionsJsonSchema } from './finishing-options.js';
import { gradedPatternRequestJsonSchema } from './graded-pattern-request.js';
import { gradedPatternJsonSchema } from './graded-pattern.js';
import { sizeLabelJsonSchema } from './size-label.js';
import { measurementSetJsonSchema } from './measurement-set.js';

/** Tous les schémas par clé, pour la validation à l'exécution (Ajv). */
export const jsonSchemas = {
  avatarOptions: avatarOptionsJsonSchema,
  createDesignRequest: createDesignRequestJsonSchema,
  createDesignVersionRequest: createDesignVersionRequestJsonSchema,
  cutPatternOptions: cutPatternOptionsJsonSchema,
  designDocument: designDocumentJsonSchema,
  designExportRequest: designExportRequestJsonSchema,
  designOperation: designOperationJsonSchema,
  designVersionChanges: designVersionChangesJsonSchema,
  designVersionPage: designVersionPageJsonSchema,
  designVersionSummary: designVersionSummaryJsonSchema,
  designVersion: designVersionJsonSchema,
  design: designJsonSchema,
  drapeRequest: drapeRequestJsonSchema,
  drape: drapeJsonSchema,
  drapeJob: drapeJobJsonSchema,
  drapeResult: drapeResultJsonSchema,
  fabricBenchMeasurements: fabricBenchMeasurementsJsonSchema,
  fabricDerivedValues: fabricDerivedValuesJsonSchema,
  fabricPhysics: fabricPhysicsJsonSchema,
  fabricPresetReview: fabricPresetReviewJsonSchema,
  fabricValidationReport: fabricValidationReportJsonSchema,
  fabric: fabricJsonSchema,
  cloudEvent: cloudEventJsonSchema,
  designVersioned: designVersionedJsonSchema,
  drapeCompleted: drapeCompletedJsonSchema,
  drapeFailed: drapeFailedJsonSchema,
  drapeRequested: drapeRequestedJsonSchema,
  garmentRequest: garmentRequestJsonSchema,
  garmentSpec: garmentSpecJsonSchema,
  garmentType: garmentTypeJsonSchema,
  cutPatternRequest: cutPatternRequestJsonSchema,
  cutPattern: cutPatternJsonSchema,
  cuttingPlanRequest: cuttingPlanRequestJsonSchema,
  cuttingPlan: cuttingPlanJsonSchema,
  exportRequest: exportRequestJsonSchema,
  finishingOptions: finishingOptionsJsonSchema,
  gradedPatternRequest: gradedPatternRequestJsonSchema,
  gradedPattern: gradedPatternJsonSchema,
  sizeLabel: sizeLabelJsonSchema,
  measurementSet: measurementSetJsonSchema,
} as const;

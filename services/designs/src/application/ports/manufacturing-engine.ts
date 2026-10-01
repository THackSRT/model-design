import type {
  CutPattern,
  CutPatternRequest,
  ExportRequest,
  GarmentSpec,
} from '@atelier/contracts-ts';
import type { Result } from '@atelier/kernel';

/** Types de problèmes du moteur de fabrication relayés tels quels (liste du contrat designs). */
export const MANUFACTURING_PROBLEM_TYPES = [
  'unknown-edge',
  'allowance-on-fold',
  'allowance-on-dart',
  'adjacent-darts',
  'notch-outside-edge',
  'open-contour',
  'fold-edge-missing',
  'cut-line-self-intersects',
  'export-format-unavailable',
] as const;
export type ManufacturingProblemType = (typeof MANUFACTURING_PROBLEM_TYPES)[number];

export type ManufacturingFailure =
  | { kind: 'manufacturing-problem'; type: ManufacturingProblemType; detail: string }
  | { kind: 'engine-unavailable'; detail: string };

export type CutPatternOptionsInput = Pick<CutPatternRequest, 'finishing' | 'sizeLabel'>;
export type ExportOptionsInput = Omit<ExportRequest, 'spec' | 'locale'>;

/** Moteur de fabrication : spécification de patron -> pièces de coupe et fichiers d'export. */
export interface ManufacturingEngine {
  cutPattern(
    spec: GarmentSpec,
    options: CutPatternOptionsInput,
  ): Promise<Result<CutPattern, ManufacturingFailure>>;
  exportFile(
    spec: GarmentSpec,
    request: ExportOptionsInput,
  ): Promise<Result<Uint8Array, ManufacturingFailure>>;
}

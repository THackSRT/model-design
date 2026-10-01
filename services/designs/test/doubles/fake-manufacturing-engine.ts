import type { CutPattern, GarmentSpec } from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import type {
  CutPatternOptionsInput,
  ExportOptionsInput,
  ManufacturingEngine,
  ManufacturingFailure,
} from '../../src/application/ports/manufacturing-engine.js';

export const FAKE_FILE_BYTES = new Uint8Array([0xff, 0x00, 0x25, 0x50, 0x44, 0x46]);

/** Pièces de coupe minimales conformes au contrat (un triangle). */
export const aCutPattern = (): CutPattern => ({
  unit: 'mm',
  engine: { name: 'manufacturing', version: '0.4.0' },
  specEngine: { name: 'patterning', version: '0.1.0' },
  garment: { type: 'straight-skirt' },
  pieces: [
    {
      panelId: 'front',
      name: 'Devant',
      quantity: 1,
      cutOnFold: false,
      cutLine: [
        [-10, -10],
        [110, -10],
        [-10, 110],
      ],
      seamLine: [
        {
          edgeId: 'a',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [0, 0],
            [100, 0],
          ],
        },
        {
          edgeId: 'b',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [100, 0],
            [0, 100],
          ],
        },
        {
          edgeId: 'c',
          role: 'seam',
          allowanceMm: 10,
          points: [
            [0, 100],
            [0, 0],
          ],
        },
      ],
      notches: [],
      grainline: [
        [30, 20],
        [30, 60],
      ],
      labelAnchor: [30, 30],
      bounds: { min: [-10, -10], max: [110, 110] },
      cutAreaMm2: 7200,
    },
  ],
});

/** Moteur de fabrication simulé : rend un résultat fixe, ou l'échec demandé, et garde les appels. */
export class FakeManufacturingEngine implements ManufacturingEngine {
  cutCalls: { spec: GarmentSpec; options: CutPatternOptionsInput }[] = [];
  exportCalls: { spec: GarmentSpec; request: ExportOptionsInput }[] = [];
  constructor(
    private readonly failure?: ManufacturingFailure,
    private readonly pattern: CutPattern = aCutPattern(),
  ) {}

  async cutPattern(
    spec: GarmentSpec,
    options: CutPatternOptionsInput,
  ): Promise<Result<CutPattern, ManufacturingFailure>> {
    this.cutCalls.push({ spec, options });
    return this.failure ? err(this.failure) : ok(this.pattern);
  }

  async exportFile(
    spec: GarmentSpec,
    request: ExportOptionsInput,
  ): Promise<Result<Uint8Array, ManufacturingFailure>> {
    this.exportCalls.push({ spec, request });
    return this.failure ? err(this.failure) : ok(FAKE_FILE_BYTES);
  }
}

import type {
  CreateDesignRequest,
  Design,
  DesignVersion,
  GarmentSpec,
} from '@atelier/contracts-ts';
import { err, ok } from '@atelier/kernel';
import type { FittedMannequin } from '@atelier/mannequin';
import type { ApiProblem, DesignsClient } from '../src/api/designs-client.js';
import type { MannequinFitter } from '../src/pattern-studio/fitter.js';

export const spec: GarmentSpec = {
  specVersion: '1.0',
  unit: 'mm',
  engine: { name: 'patterning', version: '0.1.0' },
  garment: { type: 'straight-skirt' },
  panels: [
    {
      id: 'front',
      name: 'Devant',
      quantity: 1,
      edges: [
        { id: 'hem', from: [0, 0], to: [250, 0] },
        { id: 'side', from: [250, 0], to: [180, 600], controls: [[250, 450]] },
        { id: 'waist', from: [180, 600], to: [0, 600] },
        { id: 'fold', from: [0, 600], to: [0, 0] },
      ],
    },
    {
      id: 'back',
      name: 'Dos',
      quantity: 1,
      edges: [
        { id: 'hem', from: [0, 0], to: [250, 0] },
        { id: 'side', from: [250, 0], to: [0, 600] },
        { id: 'fold', from: [0, 600], to: [0, 0] },
      ],
    },
  ],
  seams: [],
};

const design: Design = {
  id: '01920000-0000-7000-8000-00000000d001',
  organizationId: '01920000-0000-7000-8000-000000000001',
  name: 'Jupe droite',
  garmentType: 'straight-skirt',
  createdAt: '2026-09-30T10:00:00.000Z',
  latestVersionNumber: 0,
};

export const designName = (type: string) => `Modèle ${type}`;

const unused = { type: '/problems/unused', title: 'unused', status: 500 };

export interface FakeDesigns extends DesignsClient {
  versions: number;
  versionDesignIds: string[];
  created: CreateDesignRequest[];
}

export function fakeDesigns(problem?: ApiProblem): FakeDesigns {
  const client = {
    versions: 0,
    versionDesignIds: [] as string[],
    created: [] as CreateDesignRequest[],
    createDesign: async (body: CreateDesignRequest) => {
      client.created.push(body);
      return ok({ ...design, ...body, id: `${design.id.slice(0, -4)}d00${client.created.length}` });
    },
    cutPattern: async () => err(unused),
    exportFile: async () => err(unused),
    createVersion: async (id: string, body: Pick<DesignVersion, 'measurements' | 'garment'>) => {
      if (problem) return err(problem);
      client.versions += 1;
      client.versionDesignIds.push(id);
      return ok({
        ...body,
        designId: id,
        number: client.versions,
        createdAt: design.createdAt,
        fingerprint: 'a'.repeat(64),
        spec,
      });
    },
  };
  return client;
}

export const fittedBody = (chestMm = 880): FittedMannequin => ({
  body: {
    positions: new Float32Array(9),
    normals: new Float32Array(9),
    index: Uint32Array.of(0, 1, 2),
  },
  measuredMm: { chest: chestMm },
  landmarksMm: { crotch: 780, hip: 900, waist: 1050, neck: 1400, knee: 480, ankle: 80 },
});

export const fakeMannequin = (): MannequinFitter => ({ fit: async () => fittedBody() });

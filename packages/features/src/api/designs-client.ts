import type {
  CreateDesignRequest,
  CreateDesignVersionRequest,
  CutPattern,
  CutPatternOptions,
  Design,
  DesignExportRequest,
  DesignVersion,
} from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';
import { exportFileName } from './file-name.js';

/** Erreur rendue par l'API (RFC 9457), ou panne réseau. `type` est stable et traduisible. */
export interface ApiProblem {
  type: string;
  title: string;
  status: number;
  detail?: string;
}

export interface DesignsClient {
  createDesign(body: CreateDesignRequest): Promise<Result<Design, ApiProblem>>;
  createVersion(
    designId: string,
    body: CreateDesignVersionRequest,
  ): Promise<Result<DesignVersion, ApiProblem>>;
  /** Pièces de coupe d'une version (calculées par le moteur de fabrication, via designs). */
  cutPattern(
    designId: string,
    versionNumber: number,
    options: CutPatternOptions,
  ): Promise<Result<CutPattern, ApiProblem>>;
  /** Fichier d'export (SVG, PDF, DXF) d'une version ; le nom vient de Content-Disposition. */
  exportFile(
    designId: string,
    versionNumber: number,
    request: DesignExportRequest,
  ): Promise<Result<ExportedFile, ApiProblem>>;
}

export interface ExportedFile {
  blob: Blob;
  fileName: string;
}

const networkProblem = (detail: string): ApiProblem => ({
  type: '/problems/network',
  title: 'network',
  status: 0,
  detail,
});

/** Client du service designs, typé par les contrats (contracts/openapi/designs.yaml). */
export function createDesignsClient(baseUrl: string, fetchFn: typeof fetch = fetch): DesignsClient {
  async function post<T>(
    path: string,
    body: unknown,
    read: (response: Response) => Promise<T>,
  ): Promise<Result<T, ApiProblem>> {
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return err((await response.json()) as ApiProblem);
      return ok(await read(response));
    } catch (error) {
      return err(networkProblem(error instanceof Error ? error.message : String(error)));
    }
  }
  const json =
    <T>() =>
    async (response: Response) =>
      (await response.json()) as T;
  const versionPath = (designId: string, versionNumber: number) =>
    `/v1/designs/${designId}/versions/${versionNumber}`;
  return {
    createDesign: (body) => post('/v1/designs', body, json<Design>()),
    createVersion: (designId, body) =>
      post(`/v1/designs/${designId}/versions`, body, json<DesignVersion>()),
    cutPattern: (designId, versionNumber, options) =>
      post(`${versionPath(designId, versionNumber)}/cut-patterns`, options, json<CutPattern>()),
    exportFile: (designId, versionNumber, request) =>
      post(`${versionPath(designId, versionNumber)}/exports`, request, async (response) => ({
        blob: await response.blob(),
        fileName: exportFileName(response.headers.get('content-disposition'), request.format),
      })),
  };
}

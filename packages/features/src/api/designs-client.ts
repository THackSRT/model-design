import type {
  CreateDesignRequest,
  CreateDesignVersionRequest,
  CutPattern,
  CutPatternOptions,
  Design,
  DesignExportRequest,
  DesignVersion,
  DesignVersionChanges,
  DesignVersionPage,
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
  /** Une page de résumés (sans mesures), la plus récente d'abord ; `cursor` est le `nextCursor` de la page précédente. */
  listVersions(
    designId: string,
    page?: VersionPageQuery,
  ): Promise<Result<DesignVersionPage, ApiProblem>>;
  /** Une version entière : mesures du client comprises (jamais gardée en cache). */
  getVersion(designId: string, versionNumber: number): Promise<Result<DesignVersion, ApiProblem>>;
  /** Différences d'entrées de la version `since` (from) à la version `versionNumber` (to). */
  getVersionChanges(
    designId: string,
    versionNumber: number,
    since: number,
  ): Promise<Result<DesignVersionChanges, ApiProblem>>;
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

/** Page demandée : `limit` de 1 à 100 (20 par défaut côté service), `cursor` opaque. */
export interface VersionPageQuery {
  cursor?: string;
  limit?: number;
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

/** Envoie la requête ; un échec HTTP rend le problème RFC 9457, une panne réseau `/problems/network`. */
async function call<T>(
  fetchFn: typeof fetch,
  url: string,
  init: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<Result<T, ApiProblem>> {
  try {
    const response = await fetchFn(url, init);
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

function pageQuery(page: VersionPageQuery = {}): string {
  const query = new URLSearchParams();
  if (page.limit !== undefined) query.set('limit', String(page.limit));
  if (page.cursor !== undefined) query.set('cursor', page.cursor);
  const text = query.toString();
  return text === '' ? '' : `?${text}`;
}

/** Client du service designs, typé par les contrats (contracts/openapi/designs.yaml). */
export function createDesignsClient(baseUrl: string, fetchFn: typeof fetch = fetch): DesignsClient {
  const post = <T>(path: string, body: unknown, read: (response: Response) => Promise<T>) =>
    call(
      fetchFn,
      `${baseUrl}${path}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      },
      read,
    );
  /** Lecture : `no-store`, car une version porte les mesures d'un client. */
  const get = <T>(path: string) =>
    call(
      fetchFn,
      `${baseUrl}${path}`,
      { method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store' },
      json<T>(),
    );
  return {
    listVersions: (designId, page) => get(`/v1/designs/${designId}/versions${pageQuery(page)}`),
    getVersion: (designId, versionNumber) => get(versionPath(designId, versionNumber)),
    getVersionChanges: (designId, versionNumber, since) =>
      get(`${versionPath(designId, versionNumber)}/changes?since=${since}`),
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

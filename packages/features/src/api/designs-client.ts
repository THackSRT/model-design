import type {
  CreateDesignRequest,
  CreateDesignVersionRequest,
  Design,
  DesignVersion,
} from '@atelier/contracts-ts';
import { err, ok, type Result } from '@atelier/kernel';

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
}

const networkProblem = (detail: string): ApiProblem => ({
  type: '/problems/network',
  title: 'network',
  status: 0,
  detail,
});

/** Client du service designs, typé par les contrats (contracts/openapi/designs.yaml). */
export function createDesignsClient(baseUrl: string, fetchFn: typeof fetch = fetch): DesignsClient {
  async function post<T>(path: string, body: unknown): Promise<Result<T, ApiProblem>> {
    try {
      const response = await fetchFn(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json: unknown = await response.json();
      return response.ok ? ok(json as T) : err(json as ApiProblem);
    } catch (error) {
      return err(networkProblem(error instanceof Error ? error.message : String(error)));
    }
  }
  return {
    createDesign: (body) => post<Design>('/v1/designs', body),
    createVersion: (designId, body) =>
      post<DesignVersion>(`/v1/designs/${designId}/versions`, body),
  };
}

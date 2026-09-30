import { err, ok, type Result } from '@atelier/kernel';

export type HttpFailure =
  | { kind: 'timeout' }
  | { kind: 'unreachable'; detail: string }
  | { kind: 'http-error'; status: number; body: unknown };

export interface JsonRequest {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs: number;
  headers?: Record<string, string>;
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text;
  }
}

/**
 * Appel JSON avec délai. Pas de nouvelle tentative ici : les reprises sont faites par le maillage,
 * à un seul endroit (voir l'architecture, section 10.6).
 */
export async function requestJson(req: JsonRequest): Promise<Result<unknown, HttpFailure>> {
  try {
    const response = await fetch(req.url, {
      method: req.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...req.headers },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(req.timeoutMs),
    });
    const body = await readBody(response);
    return response.ok ? ok(body) : err({ kind: 'http-error', status: response.status, body });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError')
      return err({ kind: 'timeout' });
    return err({
      kind: 'unreachable',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

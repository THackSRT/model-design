import { err, ok, type Result } from '@atelier/kernel';

export type HttpFailure =
  | { kind: 'timeout' }
  | { kind: 'unreachable'; detail: string }
  | { kind: 'http-error'; status: number; body: unknown }
  | { kind: 'too-large'; maxBytes: number };

export interface JsonRequest {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs: number;
  headers?: Record<string, string>;
}

function failureOf(error: unknown): HttpFailure {
  if (error instanceof DOMException && error.name === 'TimeoutError') return { kind: 'timeout' };
  return {
    kind: 'unreachable',
    detail: error instanceof Error ? error.message : String(error),
  };
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
    return err(failureOf(error));
  }
}

export interface BytesRequest {
  url: string;
  method?: 'GET' | 'POST';
  body?: unknown;
  timeoutMs: number;
  headers?: Record<string, string>;
  /** Taille maximale du corps de réponse, en octets (défaut : 20 Mio). */
  maxBytes?: number;
}

export interface BytesResponse {
  status: number;
  contentType?: string;
  bytes: Uint8Array;
}

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024;

/** Lit le corps par morceaux ; `undefined` si la taille dépasse la limite. */
async function readBytes(response: Response, maxBytes: number): Promise<Uint8Array | undefined> {
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) return undefined;
  const chunks: Uint8Array[] = [];
  let total = 0;
  if (response.body) {
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.byteLength;
      if (total > maxBytes) return undefined;
      chunks.push(chunk);
    }
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function parseErrorBody(bytes: Uint8Array): unknown {
  const text = new TextDecoder().decode(bytes);
  try {
    return text ? JSON.parse(text) : undefined;
  } catch {
    return text;
  }
}

/**
 * Appel avec réponse binaire (PDF, DXF…), même délai et même absence de reprise que `requestJson`.
 * Un corps au-delà de `maxBytes` donne l'échec `too-large`.
 */
export async function requestBytes(req: BytesRequest): Promise<Result<BytesResponse, HttpFailure>> {
  const maxBytes = req.maxBytes ?? DEFAULT_MAX_BYTES;
  try {
    const response = await fetch(req.url, {
      method: req.method ?? 'GET',
      headers: { 'content-type': 'application/json', ...req.headers },
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      signal: AbortSignal.timeout(req.timeoutMs),
    });
    const bytes = await readBytes(response, maxBytes);
    if (bytes === undefined) return err({ kind: 'too-large', maxBytes });
    if (!response.ok)
      return err({ kind: 'http-error', status: response.status, body: parseErrorBody(bytes) });
    const contentType = response.headers.get('content-type') ?? undefined;
    return ok({ status: response.status, contentType, bytes });
  } catch (error) {
    return err(failureOf(error));
  }
}

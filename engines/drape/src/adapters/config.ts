import type { S3Options } from './s3-store.js';

// Configuration du travailleur par variables d'environnement, validée au démarrage. Les erreurs nomment la variable,
// jamais sa valeur (les clés S3 sont des secrets).

export interface WorkerConfig {
  natsUrl: string;
  s3: S3Options;
}

export class ConfigError extends Error {
  constructor(variable: string, problem: string) {
    super(`Variable ${variable} ${problem}.`);
    this.name = 'ConfigError';
  }
}

type Env = Readonly<Record<string, string | undefined>>;

function required(env: Env, name: string): string {
  const value = env[name]?.trim();
  if (!value) throw new ConfigError(name, 'manquante');
  return value;
}

function httpUrl(env: Env, name: string): string {
  const value = required(env, name);
  try {
    const { protocol } = new URL(value);
    if (protocol === 'http:' || protocol === 'https:') return value;
  } catch {
    // tombe dans l'erreur ci-dessous, sans citer la valeur
  }
  throw new ConfigError(name, 'doit être une URL http ou https');
}

function timeoutMs(env: Env): number {
  const raw = env['S3_TIMEOUT_MS']?.trim();
  if (!raw) return 30_000;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 100 || value > 300_000) {
    throw new ConfigError('S3_TIMEOUT_MS', 'doit être un entier de 100 à 300000');
  }
  return value;
}

/**
 * `undefined` sans `NATS_URL` : le moteur ne garde que son serveur de santé. Avec `NATS_URL`, le stockage S3 est
 * obligatoire (`S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) ; `S3_REGION` (us-east-1), `S3_BUCKET`
 * (drapes) et `S3_TIMEOUT_MS` (30 000) ont un défaut.
 */
export function loadWorkerConfig(env: Env): WorkerConfig | undefined {
  if (!env['NATS_URL']?.trim()) return undefined;
  return {
    natsUrl: env['NATS_URL'].trim(),
    s3: {
      endpoint: httpUrl(env, 'S3_ENDPOINT'),
      region: env['S3_REGION']?.trim() || 'us-east-1',
      bucket: env['S3_BUCKET']?.trim() || 'drapes',
      accessKeyId: required(env, 'S3_ACCESS_KEY_ID'),
      secretAccessKey: required(env, 'S3_SECRET_ACCESS_KEY'),
      timeoutMs: timeoutMs(env),
    },
  };
}

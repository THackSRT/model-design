/** Journaux JSON structurés. Identifiants seulement : jamais de mesure, de téléphone ni de jeton. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogFields = Record<string, string | number | boolean | undefined>;

export interface Logger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
  child(fields: LogFields): Logger;
}

export type LogSink = (line: string) => void;

export function createLogger(
  base: LogFields = {},
  sink: LogSink = (l) => process.stdout.write(`${l}\n`),
): Logger {
  return {
    log(level, event, fields = {}) {
      sink(JSON.stringify({ time: new Date().toISOString(), level, event, ...base, ...fields }));
    },
    child(fields) {
      return createLogger({ ...base, ...fields }, sink);
    },
  };
}

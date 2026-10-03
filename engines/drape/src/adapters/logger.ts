// Journal JSON d'une ligne par événement. Identifiants et noms d'erreur seulement : jamais de mesure, de contenu de
// tâche, de message d'erreur ni de secret (ADR 0013).

export type LogFields = Record<string, string | number | boolean | undefined>;

export interface Logger {
  log(level: 'info' | 'warn' | 'error', event: string, fields?: LogFields): void;
}

export const consoleLogger: Logger = {
  log(level, event, fields = {}) {
    process.stdout.write(
      `${JSON.stringify({ time: new Date().toISOString(), level, event, ...fields })}\n`,
    );
  },
};

/** Nature de l'erreur seulement (son nom) : le message peut citer une valeur de l'entrée. */
export const errorName = (error: unknown): string | undefined =>
  error instanceof Error ? error.name : undefined;

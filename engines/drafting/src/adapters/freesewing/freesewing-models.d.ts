// Types de `@freesewing/models` 4.10.2, qui n'a pas de types (ADR 0019, défaut P4) : la seule surface utilisée.
// Branché par `paths` dans tsconfig.json ; le module reste celui de node_modules à l'exécution.

/** Tailles des tableaux adultes : le nombre est le tour de cou en cm. */
export declare const sizes: {
  readonly cisFemaleAdult: readonly number[];
  readonly cisMaleAdult: readonly number[];
};

/** Jeux de mesures des tailles adultes, par table puis par taille (`adult.cisMale['42']`), en mm et en degrés. */
export declare const adult: {
  readonly cisFemale: Readonly<Record<string, Readonly<Record<string, number>> | undefined>>;
  readonly cisMale: Readonly<Record<string, Readonly<Record<string, number>> | undefined>>;
};

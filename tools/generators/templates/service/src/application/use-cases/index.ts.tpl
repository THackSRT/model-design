import type { Clock, IdGenerator } from '@atelier/kernel';

export interface __Name__Deps {
  ids: IdGenerator;
  clock: Clock;
}

/** Les cas d'usage du service, chacun relié à ses dépendances (un fichier par cas d'usage). */
export function __nameCamel__UseCases(deps: __Name__Deps) {
  void deps;
  return {};
}

export type __Name__UseCases = ReturnType<typeof __nameCamel__UseCases>;

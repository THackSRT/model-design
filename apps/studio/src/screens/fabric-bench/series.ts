import type { BenchDraft } from '@atelier/features';

/**
 * Nombre de lectures d'une série à afficher : celles déjà saisies plus une vide, dans la limite du contrat.
 * Le modéliste ajoute une lecture en remplissant la dernière.
 */
export function visibleReadings(draft: BenchDraft, path: string, maxItems: number): number {
  let last = -1;
  for (let i = 0; i < maxItems; i += 1) {
    if (draft[`${path}.${i}`] !== undefined) last = i;
  }
  return Math.min(maxItems, last + 2);
}

const FINE_LIMIT = 10;
const MEDIUM_LIMIT = 100;

/** Pas des flèches d'un champ, selon l'ordre de grandeur de sa borne haute. */
export function stepFor(max: number | undefined): number {
  const top = max ?? 0;
  if (top <= FINE_LIMIT) return 0.01;
  return top <= MEDIUM_LIMIT ? 0.1 : 1;
}

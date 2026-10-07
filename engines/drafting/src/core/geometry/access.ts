import { GeometryError } from './errors.js';

/** Élément d'indice `index` ; les boucles bornent l'indice, l'erreur ne sert qu'à garder le typage strict. */
export function itemAt<T>(items: readonly T[], index: number): T {
  const found = items[index];
  if (found === undefined) throw new GeometryError('invalid-argument', 'index out of range');
  return found;
}

/** Élément d'indice `index` d'une liste vue comme un cycle : −1 est le dernier, `items.length` le premier. */
export function ringItemAt<T>(items: readonly T[], index: number): T {
  const count = items.length;
  return itemAt(items, ((index % count) + count) % count);
}

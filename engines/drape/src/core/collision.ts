import type { BodyGrid } from './body-grid.js';
import { nearestOnBody, NEAREST_SIZE, WORK_SIZE } from './body-query.js';
import { distanceToSurface, isInsideBody, type InsideTest } from './inside.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Tampons réutilisés pour la collision (aucune allocation dans la boucle). */
export interface CollisionScratch {
  point: Float64Array;
  work: Float64Array;
  nearest: Float64Array;
  /** Position de la dernière requête, par sommet. */
  lastQuery: Float64Array;
  /** Distance que le sommet peut parcourir depuis sa dernière requête sans pouvoir toucher le corps (mm). */
  slack: Float64Array;
  /** Triangle le plus proche à la dernière requête, par sommet (-1 si aucun). */
  lastTriangle: Int32Array;
}

export function createCollisionScratch(vertexCount: number): CollisionScratch {
  return {
    point: new Float64Array(3),
    work: new Float64Array(WORK_SIZE),
    nearest: new Float64Array(NEAREST_SIZE),
    lastQuery: new Float64Array(3 * vertexCount),
    slack: new Float64Array(vertexCount),
    lastTriangle: new Int32Array(vertexCount).fill(-1),
  };
}

export interface ContactSettings {
  /** Distance sommet-surface imposée (épaisseur du tissu + marge), mm. */
  offsetMm: number;
  friction: number;
}

/** Direction de poussée (unitaire) dans scratch.nearest[4..6] remplacée : écrit dans `dir`. */
function pushDirection(n: Float64Array, p: Float64Array, dir: Float64Array): void {
  const dist = f(n, 0);
  const outside = f(n, 7) > 0 && dist > 1e-9;
  for (let k = 0; k < 3; k++) dir[k] = outside ? (f(p, k) - f(n, 1 + k)) / dist : f(n, 4 + k);
}

/** Frottement de Coulomb positionnel : retire du déplacement du pas sa part tangentielle, bornée par μ·pénétration. */
function applyFriction(
  state: { x: Float64Array; prev: Float64Array },
  v: number,
  dir: Float64Array,
  limit: number,
): void {
  const { x, prev } = state;
  let normal = 0;
  for (let k = 0; k < 3; k++) normal += (f(x, 3 * v + k) - f(prev, 3 * v + k)) * f(dir, k);
  let t2 = 0;
  for (let k = 0; k < 3; k++) {
    const t = f(x, 3 * v + k) - f(prev, 3 * v + k) - normal * f(dir, k);
    t2 += t * t;
  }
  const tl = Math.sqrt(t2);
  if (tl <= 1e-12) return;
  const scale = Math.min(1, limit / tl);
  for (let k = 0; k < 3; k++) {
    const t = f(x, 3 * v + k) - f(prev, 3 * v + k) - normal * f(dir, k);
    x[3 * v + k] = f(x, 3 * v + k) - t * scale;
  }
}

/** Vrai si le sommet a parcouru depuis sa dernière requête plus que sa marge : il faut l'interroger de nouveau. */
function isCloseToBody(point: Float64Array, last: Float64Array, v: number, slack: number): boolean {
  const dx = f(point, 0) - f(last, 3 * v);
  const dy = f(point, 1) - f(last, 3 * v + 1);
  const dz = f(point, 2) - f(last, 3 * v + 2);
  return dx * dx + dy * dy + dz * dz >= slack * slack;
}

interface VertexContext {
  scratch: CollisionScratch;
  contact: ContactSettings;
}

/**
 * Interroge le corps pour le sommet v (sauf si sa marge garantit qu'il ne peut rien toucher). Rend vrai s'il est
 * plus près que `offsetMm` de la surface ou dedans ; `scratch.nearest` décrit alors le point le plus proche.
 */
function queryVertex(grid: BodyGrid, x: Float64Array, v: number, s: VertexContext): boolean {
  const { scratch } = s;
  const { point, work, nearest, lastQuery, slack } = scratch;
  for (let k = 0; k < 3; k++) point[k] = f(x, 3 * v + k);
  if (!isCloseToBody(point, lastQuery, v, f(slack, v))) return false;
  for (let k = 0; k < 3; k++) lastQuery[3 * v + k] = f(point, k);
  const found = nearestOnBody(grid, point, scratch.lastTriangle[v] as number, {
    work,
    out: nearest,
  });
  scratch.lastTriangle[v] = found ? f(nearest, 8) : -1;
  const signed = f(nearest, 7);
  // Le corps est à au moins `dist` (ou `portée` si rien n'est à portée) : le sommet ne le touche pas avant d'avoir
  // parcouru dist - offset.
  const dist = found ? f(nearest, 0) : grid.rangeMm;
  slack[v] = found && signed <= 0 ? 0 : Math.max(0, dist - s.contact.offsetMm);
  return found && signed < s.contact.offsetMm;
}

/**
 * Pousse hors du corps le sommet v s'il est plus près que `offsetMm` de la surface (ou dedans), puis applique le
 * frottement. `prev` : positions au début du sous-pas. Rend la profondeur de correction (mm), 0 si libre.
 */
function collideVertex(
  grid: BodyGrid,
  state: { x: Float64Array; prev: Float64Array },
  v: number,
  s: VertexContext,
): number {
  if (!queryVertex(grid, state.x, v, s)) return 0;
  const { work, nearest, point } = s.scratch;
  const dir = work; // réutilisé comme tampon : la requête est finie
  pushDirection(nearest, point, dir);
  const depth = s.contact.offsetMm - f(nearest, 7);
  for (let k = 0; k < 3; k++) {
    // Cible : q + dir · offset (même résultat que p + dir · profondeur, avec p - q non nécessairement le long de dir).
    state.x[3 * v + k] = f(nearest, 1 + k) + f(dir, k) * s.contact.offsetMm;
  }
  applyFriction(state, v, dir, s.contact.friction * depth);
  return depth;
}

/** Collision de tous les sommets libres avec le corps. Rend la plus grande correction du sous-pas. */
export function collideCloth(
  grid: BodyGrid,
  state: { x: Float64Array; prev: Float64Array },
  invMass: Float64Array,
  s: { scratch: CollisionScratch; contact: ContactSettings },
): number {
  let deepest = 0;
  for (let v = 0; v < invMass.length; v++) {
    if (f(invMass, v) <= 0) continue;
    deepest = Math.max(deepest, collideVertex(grid, state, v, s));
  }
  return deepest;
}

/**
 * Profondeur de pénétration maximale sous la surface réelle du corps (0 si aucun sommet dedans), mm. Un sommet est
 * dedans par le test de parité (`inside`), sans limite de portée ; sa profondeur est sa distance à la surface.
 */
export function maxPenetration(
  grid: BodyGrid,
  x: Float64Array,
  scratch: CollisionScratch,
  inside: InsideTest,
): number {
  let deepest = 0;
  for (let v = 0; v < x.length / 3; v++) {
    for (let k = 0; k < 3; k++) scratch.point[k] = f(x, 3 * v + k);
    if (!isInsideBody(inside, f(x, 3 * v), f(x, 3 * v + 1), f(x, 3 * v + 2))) continue;
    const found = nearestOnBody(grid, scratch.point, -1, {
      work: scratch.work,
      out: scratch.nearest,
    });
    deepest = Math.max(
      deepest,
      found ? f(scratch.nearest, 0) : distanceToSurface(grid, scratch.point, scratch.work),
    );
  }
  return deepest;
}

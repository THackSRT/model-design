// Parcours du contour d'une pièce pour en tirer la ligne d'ancrage (ADR 0013) : la chaîne continue tant que l'angle
// au raccord reste sous 45°, enjambe une pince et ne suit jamais un bord `fold`.

/** cos 45° : au-delà (angle plus petit) la ligne continue. */
const MAX_TURN_COS = Math.SQRT1_2;
const TINY = 1e-9;
/** Écart sous lequel deux segments sont également près de l'ancre (elle est à un coin du contour), mm. */
const ANCHOR_TIE_MM = 0.5;

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

/** Contour parcouru dans un sens : le segment k va du point k au point k + 1 (circulaire) et porte le bord `edge[k]`. */
export interface Loop {
  x: Float64Array;
  y: Float64Array;
  edge: Int32Array;
}

export interface Rules {
  isFold(edge: number): boolean;
  /** Vrai si les deux bords (indices du contrat) sont cousus l'un à l'autre : une pince. */
  isDart(a: number, b: number): boolean;
}

/** Pince enjambée : de `from` (début d'un côté) à `to` (début de l'autre) ; côtés = points xy, depuis chaque ouverture jusqu'à la pointe. */
export interface Jump {
  from: [number, number];
  to: [number, number];
  left: number[];
  right: number[];
}

export interface Step {
  /** Segment suivant de la chaîne. */
  seg: number;
  jump?: Jump;
}

export function dirOf(loop: Loop, k: number): [number, number] {
  const j = (k + 1) % loop.edge.length;
  return [f(loop.x, j) - f(loop.x, k), f(loop.y, j) - f(loop.y, k)];
}

/** Vrai si l'angle entre les segments j et m est sous 45° (un segment sans longueur ne bloque pas). */
function straightEnough(loop: Loop, j: number, m: number): boolean {
  const [ax, ay] = dirOf(loop, j);
  const [bx, by] = dirOf(loop, m);
  const la = Math.sqrt(ax * ax + ay * ay);
  const lb = Math.sqrt(bx * bx + by * by);
  if (la < TINY || lb < TINY) return true;
  return (ax * bx + ay * by) / (la * lb) >= MAX_TURN_COS;
}

/** Dernier segment de la suite de segments de même bord qui commence en k. */
function runEnd(loop: Loop, k: number): number {
  const n = loop.edge.length;
  let last = k;
  for (let i = 0; i < n && loop.edge[(last + 1) % n] === loop.edge[k]; i++) last = (last + 1) % n;
  return last;
}

/** Points xy des sommets de a à b (indices circulaires, bornes comprises). */
function points(loop: Loop, a: number, b: number): number[] {
  const n = loop.edge.length;
  const out: number[] = [];
  for (let k = a, i = 0; i <= n; k = (k + 1) % n, i++) {
    out.push(f(loop.x, k), f(loop.y, k));
    if (k === b) break;
  }
  return out;
}

function jumpOf(loop: Loop, legs: { first: number; apex: number; after: number }): Jump {
  const from: [number, number] = [f(loop.x, legs.first), f(loop.y, legs.first)];
  const to: [number, number] = [f(loop.x, legs.after), f(loop.y, legs.after)];
  const right: number[] = [];
  const back = points(loop, legs.apex, legs.after);
  for (let i = back.length - 2; i >= 0; i -= 2)
    right.push(back[i] as number, back[i + 1] as number);
  return { from, to, left: points(loop, legs.first, legs.apex), right };
}

/** Pas suivant de la chaîne arrêtée au segment j (direct, ou après une pince), `undefined` si elle s'arrête. */
function continuation(loop: Loop, j: number, rules: Rules): Step | undefined {
  const n = loop.edge.length;
  const next = (j + 1) % n;
  const e1 = loop.edge[next] as number;
  if (rules.isFold(e1)) return undefined;
  if (straightEnough(loop, j, next)) return { seg: next };
  const apex = (runEnd(loop, next) + 1) % n;
  const e2 = loop.edge[apex] as number;
  if (e2 === e1 || !rules.isDart(e1, e2)) return undefined;
  const after = (runEnd(loop, apex) + 1) % n;
  if (rules.isFold(loop.edge[after] as number) || !straightEnough(loop, j, after)) return undefined;
  return { seg: after, jump: jumpOf(loop, { first: next, apex, after }) };
}

/** Pas suivant `start` dans le sens de la boucle, tant que la ligne continue. */
export function walk(loop: Loop, start: number, rules: Rules): Step[] {
  const n = loop.edge.length;
  const out: Step[] = [];
  let j = start;
  let travelled = 0;
  for (;;) {
    const step = continuation(loop, j, rules);
    travelled += step ? (step.seg - j + n) % n : n;
    if (!step || travelled >= n) return out;
    out.push(step);
    j = step.seg;
  }
}

/** La même boucle parcourue en sens inverse ; le segment k de l'inverse est le segment (n − 2 − k) de la boucle. */
export function reversedLoop(loop: Loop): Loop {
  const n = loop.edge.length;
  return {
    x: loop.x.slice().reverse(),
    y: loop.y.slice().reverse(),
    edge: Int32Array.from({ length: n }, (_, k) => loop.edge[(n - 2 - k + n) % n] as number),
  };
}

/** Parmi les segments à moins de ANCHOR_TIE_MM du plus proche, le plus horizontal. */
function flattestNear(loop: Loop, dist2: Float64Array, nearest: number): number {
  const reach = nearest + ANCHOR_TIE_MM;
  const limit = reach * reach;
  let index = 0;
  let slope = Infinity;
  for (let k = 0; k < dist2.length; k++) {
    if (f(dist2, k) > limit) continue;
    const [dx, dy] = dirOf(loop, k);
    const tilt = Math.abs(dy) / Math.sqrt(dx * dx + dy * dy);
    if (tilt < slope - 1e-9) [index, slope] = [k, tilt];
  }
  return index;
}

/** Segment le plus proche de (px, py) ; si l'ancre est à un coin du contour, le plus horizontal des deux. */
export function nearestSegment(loop: Loop, px: number, py: number): number {
  const dist2 = new Float64Array(loop.edge.length).fill(Infinity);
  let best = Infinity;
  for (let k = 0; k < loop.edge.length; k++) {
    const [dx, dy] = dirOf(loop, k);
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < TINY) continue;
    const along = ((px - f(loop.x, k)) * dx + (py - f(loop.y, k)) * dy) / len;
    const at = Math.max(0, Math.min(len, along));
    const ex = f(loop.x, k) + (dx * at) / len - px;
    const ey = f(loop.y, k) + (dy * at) / len - py;
    dist2[k] = ex * ex + ey * ey;
    best = Math.min(best, f(dist2, k));
  }
  return flattestNear(loop, dist2, Math.sqrt(best));
}

/*
 * Outils de maillage indexé : voisinage, parcours, normales, lissage. Positions à plat (x, y, z).
 */

/** Lecture d'un tableau numérique dont l'indice est connu valide. */
export const at = (a: ArrayLike<number>, i: number): number => a[i] as number;

/** Ajoute x à la case i d'un tableau numérique. */
export function add(a: { [i: number]: number; length: number }, i: number, x: number): void {
  a[i] = at(a, i) + x;
}

/** Voisins de chaque sommet dans les triangles donnés. */
export function neighbours(tris: ArrayLike<number>, n: number): number[][] {
  const sets = Array.from({ length: n }, () => new Set<number>());
  for (let t = 0; t < tris.length; t += 3) {
    const a = at(tris, t);
    const b = at(tris, t + 1);
    const c = at(tris, t + 2);
    sets[a]?.add(b).add(c);
    sets[b]?.add(a).add(c);
    sets[c]?.add(a).add(b);
  }
  return sets.map((s) => [...s]);
}

/** Sommets atteints depuis `seeds` en restant dans `allowed`. */
export function flood(adj: number[][], seeds: number[], allowed: (v: number) => boolean): number[] {
  const seen = new Uint8Array(adj.length);
  const stack = seeds.filter(allowed);
  for (const s of stack) seen[s] = 1;
  const out: number[] = [];
  while (stack.length) {
    const v = stack.pop() as number;
    out.push(v);
    for (const w of adj[v] ?? []) {
      if (seen[w] || !allowed(w)) continue;
      seen[w] = 1;
      stack.push(w);
    }
  }
  return out;
}

/**
 * Rangées successives autour d'un ensemble de sommets (anneaux de voisinage), sans repasser par
 * `taken` ni par les sommets refusés.
 */
export function rings(
  adj: number[][],
  start: number[],
  count: number,
  refuse: (v: number) => boolean = () => false,
): number[][] {
  const taken = new Uint8Array(adj.length);
  for (const v of start) taken[v] = 1;
  const out: number[][] = [];
  let front = start;
  for (let r = 0; r < count; r++) {
    front = [...new Set(front.flatMap((v) => adj[v] ?? []))].filter((w) => !taken[w] && !refuse(w));
    for (const w of front) taken[w] = 1;
    out.push(front);
  }
  return out;
}

/** Normales unitaires des sommets (moyenne des normales des triangles, pondérée par l'aire). */
export function vertexNormals(pos: Float32Array, tris: ArrayLike<number>): Float32Array {
  const nor = new Float32Array(pos.length);
  const p = (i: number, q: number) => at(pos, 3 * i + q);
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [at(tris, t), at(tris, t + 1), at(tris, t + 2)];
    const e1 = [0, 1, 2].map((q) => p(b, q) - p(a, q));
    const e2 = [0, 1, 2].map((q) => p(c, q) - p(a, q));
    for (let q = 0; q < 3; q++) {
      const n =
        at(e1, (q + 1) % 3) * at(e2, (q + 2) % 3) - at(e1, (q + 2) % 3) * at(e2, (q + 1) % 3);
      for (const i of [a, b, c]) add(nor, 3 * i + q, n);
    }
  }
  for (let v = 0; v < nor.length / 3; v++) {
    const l = Math.hypot(at(nor, 3 * v), at(nor, 3 * v + 1), at(nor, 3 * v + 2)) || 1;
    for (let q = 0; q < 3; q++) nor[3 * v + q] = at(nor, 3 * v + q) / l;
  }
  return nor;
}

/** Écart entre la moyenne des voisins et le sommet, sur l'axe q. */
export function umbrella(pos: Float32Array, adj: number[][], v: number, q: number): number {
  const nb = adj[v] ?? [];
  let s = 0;
  for (const w of nb) s += at(pos, 3 * w + q);
  return nb.length ? s / nb.length - at(pos, 3 * v + q) : 0;
}

/** Lissage de Taubin (sans rétrécissement) limité aux sommets donnés. */
export function taubin(pos: Float32Array, adj: number[][], verts: number[], passes: number): void {
  const step = (f: number) => {
    const delta = verts.map((v) => [0, 1, 2].map((q) => f * umbrella(pos, adj, v, q)));
    verts.forEach((v, k) => [0, 1, 2].forEach((q) => add(pos, 3 * v + q, at(delta[k] ?? [], q))));
  };
  for (let pass = 0; pass < passes; pass++) {
    step(0.5);
    step(-0.53);
  }
}

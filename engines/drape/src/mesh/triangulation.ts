import { InvalidInputError } from '../core/validate.js';

// Triangulation plane incrémentale (insertion de points + retournements d'arêtes de Lawson). Triangles
// antihoraires ; `v[3t + k]` est le sommet k du triangle t, `nb[3t + k]` son voisin à travers l'arête opposée au
// sommet k, c'est-à-dire (v[k + 1], v[k + 2]) ; -1 hors du triangle englobant. Déterministe : aucun hasard.

export type Tri = readonly [number, number, number];

/** Base des clés d'arêtes : plus de 2^26 sommets sont impossibles (limite par vêtement : 30 000). */
const KEY_BASE = 2 ** 26;
const next = (k: number): number => (k === 2 ? 0 : k + 1);
const prev = (k: number): number => (k === 0 ? 2 : k - 1);

export class Triangulation {
  /** Coordonnées, 2 par sommet (capacité supérieure au nombre de sommets). */
  pts: Float64Array;
  /** Nombre de points donnés ; les 3 sommets suivants forment le triangle englobant, puis viennent les ajouts. */
  readonly realCount: number;
  vertexCount: number;
  readonly v: number[] = [];
  readonly nb: number[] = [];
  /** Un triangle incident à chaque sommet. */
  vt: Int32Array;
  private readonly constrained = new Set<number>();
  private readonly incircleTol: number;
  private last = 0;

  constructor(points: Float64Array, scaleMm: number) {
    this.realCount = points.length / 2;
    const n = this.realCount;
    this.vertexCount = n + 3;
    this.pts = new Float64Array(2 * (n + 3));
    this.pts.set(points);
    this.vt = new Int32Array(n + 3).fill(-1);
    this.incircleTol = 1e-9 * (scaleMm * scaleMm) * (scaleMm * scaleMm);
    this.addSuperTriangle(points, scaleMm);
  }

  private addSuperTriangle(points: Float64Array, scaleMm: number): void {
    let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
    for (let i = 0; i < points.length; i += 2) {
      x0 = Math.min(x0, points[i] as number);
      x1 = Math.max(x1, points[i] as number);
      y0 = Math.min(y0, points[i + 1] as number);
      y1 = Math.max(y1, points[i + 1] as number);
    }
    const span = Math.max(x1 - x0, y1 - y0, scaleMm);
    const [cx, cy, r] = [(x0 + x1) / 2, (y0 + y1) / 2, 20 * span];
    const n = this.realCount;
    this.pts.set([cx - 2 * r, cy - r, cx + 2 * r, cy - r, cx, cy + 2 * r], 2 * n);
    this.v.push(n, n + 1, n + 2);
    this.nb.push(-1, -1, -1);
    for (let k = 0; k < 3; k++) this.vt[n + k] = 0;
  }

  get triangleCount(): number {
    return this.v.length / 3;
  }

  /** Sommets du triangle t. */
  tri(t: number): Tri {
    return [this.v[3 * t] as number, this.v[3 * t + 1] as number, this.v[3 * t + 2] as number];
  }

  orient(a: number, b: number, c: number): number {
    const p = this.pts;
    return (
      ((p[2 * b] as number) - (p[2 * a] as number)) *
        ((p[2 * c + 1] as number) - (p[2 * a + 1] as number)) -
      ((p[2 * b + 1] as number) - (p[2 * a + 1] as number)) *
        ((p[2 * c] as number) - (p[2 * a] as number))
    );
  }

  /** Position de `p` par rapport à a→b, antisymétrique en (a, b) au bit près (évite les va-et-vient). */
  side(a: number, b: number, p: number): number {
    return a < b ? this.orient(a, b, p) : -this.orient(b, a, p);
  }

  /** Positif si d est dans le cercle circonscrit du triangle antihoraire (a, b, c). */
  inCircle(a: number, b: number, c: number, d: number): number {
    const p = this.pts;
    const dx = p[2 * d] as number;
    const dy = p[2 * d + 1] as number;
    const [adx, ady] = [(p[2 * a] as number) - dx, (p[2 * a + 1] as number) - dy];
    const [bdx, bdy] = [(p[2 * b] as number) - dx, (p[2 * b + 1] as number) - dy];
    const [cdx, cdy] = [(p[2 * c] as number) - dx, (p[2 * c + 1] as number) - dy];
    return (
      (adx * adx + ady * ady) * (bdx * cdy - cdx * bdy) +
      (bdx * bdx + bdy * bdy) * (cdx * ady - adx * cdy) +
      (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady)
    );
  }

  /** Vrai pour les trois sommets du triangle englobant. */
  isSuper(vertex: number): boolean {
    return vertex >= this.realCount && vertex < this.realCount + 3;
  }

  /** Ajoute un sommet (non inséré) ; renvoie son indice. */
  addPoint(x: number, y: number): number {
    const i = this.vertexCount++;
    if (2 * this.vertexCount > this.pts.length) {
      const pts = new Float64Array(2 * this.pts.length);
      pts.set(this.pts);
      this.pts = pts;
      const vt = new Int32Array(2 * this.vt.length).fill(-1);
      vt.set(this.vt);
      this.vt = vt;
    }
    this.pts[2 * i] = x;
    this.pts[2 * i + 1] = y;
    return i;
  }

  private key(a: number, b: number): number {
    return a < b ? a * KEY_BASE + b : b * KEY_BASE + a;
  }

  mark(a: number, b: number): void {
    this.constrained.add(this.key(a, b));
  }

  isConstrained(a: number, b: number): boolean {
    return this.constrained.has(this.key(a, b));
  }

  /** Indice (0, 1 ou 2) du sommet `vertex` dans le triangle `t`. */
  indexOf(t: number, vertex: number): number {
    return this.v[3 * t] === vertex ? 0 : this.v[3 * t + 1] === vertex ? 1 : 2;
  }

  /** Sommet du triangle `u` opposé à son voisin `t`. */
  apex(u: number, t: number): number {
    const j = this.nb[3 * u] === t ? 0 : this.nb[3 * u + 1] === t ? 1 : 2;
    return this.v[3 * u + j] as number;
  }

  /** 3t + k du triangle dont l'arête opposée à k relie x et y (dans un sens ou l'autre), ou -1. */
  edgeTri(x: number, y: number): number {
    const start = this.vt[x] as number;
    let s = start;
    for (let guard = 0; s >= 0 && guard < this.triangleCount; guard++) {
      const i = this.indexOf(s, x);
      if (this.v[3 * s + next(i)] === y) return 3 * s + prev(i);
      if (this.v[3 * s + prev(i)] === y) return 3 * s + next(i);
      s = this.nb[3 * s + next(i)] as number;
      if (s === start) break;
    }
    return -1;
  }

  /**
   * Remplace les triangles `old` par `fresh` (sommets antihoraires) : les indices `old` sont réutilisés, d'autres
   * sont créés si `fresh` est plus long. Recolle les voisins. Renvoie les indices des nouveaux triangles.
   */
  rebuild(old: readonly number[], fresh: readonly Tri[]): number[] {
    const outer: number[][] = [];
    for (const t of old) {
      for (let k = 0; k < 3; k++) {
        const o = this.nb[3 * t + k] as number;
        if (!old.includes(o)) {
          outer.push([this.v[3 * t + next(k)] as number, this.v[3 * t + prev(k)] as number, o]);
        }
      }
    }
    const slots = [...old];
    while (slots.length < fresh.length) {
      slots.push(this.triangleCount);
      this.v.push(0, 0, 0);
      this.nb.push(-1, -1, -1);
    }
    fresh.forEach((f, i) => {
      for (let k = 0; k < 3; k++) {
        this.v[3 * (slots[i] as number) + k] = f[k] as number;
        this.vt[f[k] as number] = slots[i] as number;
      }
    });
    fresh.forEach((f, i) => this.glue(slots, i, f, outer));
    return slots;
  }

  private glue(slots: readonly number[], i: number, f: Tri, outer: readonly number[][]): void {
    const t = slots[i] as number;
    for (let k = 0; k < 3; k++) {
      const x = f[next(k)] as number;
      const y = f[prev(k)] as number;
      const hit = outer.find((e) => e[0] === x && e[1] === y);
      if (hit) {
        const o = hit[2] as number;
        this.nb[3 * t + k] = o;
        if (o >= 0) this.nb[3 * o + this.edgeIndex(o, y, x)] = t;
        continue;
      }
      const j = slots.findIndex((s, m) => m !== i && this.edgeIndex(s, y, x) >= 0);
      this.nb[3 * t + k] = j >= 0 ? (slots[j] as number) : -1;
    }
  }

  /** Indice k de l'arête dirigée x→y du triangle t (opposée au sommet k), ou -1. */
  private edgeIndex(t: number, x: number, y: number): number {
    for (let k = 0; k < 3; k++) {
      if (this.v[3 * t + next(k)] === x && this.v[3 * t + prev(k)] === y) return k;
    }
    return -1;
  }

  /**
   * Retourne l'arête opposée au sommet k du triangle t si le quadrilatère est strictement convexe. Après le
   * retournement, t et son ancien voisin portent tous deux l'ancien sommet c en position 0. Renvoie la nouvelle
   * diagonale [c, d], ou null.
   */
  flipAt(t: number, k: number): readonly [number, number] | null {
    const u = this.nb[3 * t + k] as number;
    if (u < 0) return null;
    const c = this.v[3 * t + k] as number;
    const x = this.v[3 * t + next(k)] as number;
    const y = this.v[3 * t + prev(k)] as number;
    const d = this.apex(u, t);
    if (!(this.orient(c, x, d) > 0) || !(this.orient(c, d, y) > 0)) return null;
    this.rebuild(
      [t, u],
      [
        [c, x, d],
        [c, d, y],
      ],
    );
    return [c, d];
  }

  /** Rétablit le critère de Delaunay autour du sommet `p` en retournant les arêtes opposées à p. */
  private legalize(p: number, stack: number[]): void {
    while (stack.length > 0) {
      const t = stack.pop() as number;
      const k = this.indexOf(t, p);
      const u = this.nb[3 * t + k] as number;
      if (u < 0) continue;
      const a = this.v[3 * t + next(k)] as number;
      const b = this.v[3 * t + prev(k)] as number;
      if (this.isConstrained(a, b)) continue;
      if (this.inCircle(p, a, b, this.apex(u, t)) <= this.incircleTol) continue;
      if (this.flipAt(t, k)) stack.push(t, u);
    }
  }

  /** Marche de visibilité depuis le dernier triangle touché. */
  private locate(p: number): number {
    let t = this.last;
    for (let guard = 0; guard < 4 * this.triangleCount + 16; guard++) {
      let moved = false;
      for (let k = 0; k < 3 && !moved; k++) {
        const o = this.nb[3 * t + k] as number;
        const a = this.v[3 * t + next(k)] as number;
        const b = this.v[3 * t + prev(k)] as number;
        if (o >= 0 && this.side(a, b, p) < 0) {
          t = o;
          moved = true;
        }
      }
      if (!moved) return t;
    }
    throw new InvalidInputError('mesh', 'point location failed');
  }

  /** Insère le sommet `p` (déjà dans `pts`) et rétablit le critère de Delaunay. */
  insert(p: number): void {
    const t = this.locate(p);
    const zero: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = this.v[3 * t + next(k)] as number;
      const b = this.v[3 * t + prev(k)] as number;
      if (this.side(a, b, p) === 0) zero.push(k);
    }
    if (zero.length > 1) throw new InvalidInputError('mesh', 'two mesh points coincide');
    const slots = zero.length === 1 ? this.splitEdge(t, zero[0] as number, p) : this.split3(t, p);
    this.last = slots[0] as number;
    this.legalize(p, slots);
  }

  private split3(t: number, p: number): number[] {
    const [a, b, c] = this.tri(t);
    return this.rebuild(
      [t],
      [
        [a, b, p],
        [b, c, p],
        [c, a, p],
      ],
    );
  }

  /** p tombe sur l'arête opposée au sommet k de t : les deux triangles voisins se scindent en quatre. */
  private splitEdge(t: number, k: number, p: number): number[] {
    const a = this.v[3 * t + k] as number;
    const b = this.v[3 * t + next(k)] as number;
    const c = this.v[3 * t + prev(k)] as number;
    const u = this.nb[3 * t + k] as number;
    const d = this.apex(u, t);
    return this.rebuild(
      [t, u],
      [
        [a, b, p],
        [a, p, c],
        [d, c, p],
        [d, p, b],
      ],
    );
  }

  /** Retourne les arêtes non contraintes tant que l'une viole le critère de Delaunay (au plus 200 passes). */
  legalizeAll(): void {
    for (let pass = 0; pass < 200; pass++) {
      let flips = 0;
      for (let t = 0; t < this.triangleCount; t++) {
        for (let k = 0; k < 3; k++) flips += this.legalizeEdge(t, k) ? 1 : 0;
      }
      if (flips === 0) return;
    }
  }

  private legalizeEdge(t: number, k: number): boolean {
    const u = this.nb[3 * t + k] as number;
    if (u < 0) return false;
    const c = this.v[3 * t + k] as number;
    const a = this.v[3 * t + next(k)] as number;
    const b = this.v[3 * t + prev(k)] as number;
    if (this.isConstrained(a, b)) return false;
    if (this.inCircle(c, a, b, this.apex(u, t)) <= this.incircleTol) return false;
    return this.flipAt(t, k) !== null;
  }
}

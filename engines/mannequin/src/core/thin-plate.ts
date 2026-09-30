/*
 * Spline de plaque mince : la surface z = f(x, y) la plus lisse (énergie de flexion minimale) qui passe
 * par des points donnés. Sert à combler une zone de peau en prolongeant la courbure de son pourtour.
 */

import { add, at } from './mesh.js';

export type ThinPlate = (x: number, y: number) => number;

/** Régularisation : la surface passe au plus près des points, sans osciller entre eux. */
const SMOOTHING = 1e-3;

function kernel(dx: number, dy: number): number {
  const r2 = dx * dx + dy * dy;
  return r2 > 0 ? 0.5 * r2 * Math.log(r2) : 0;
}

/** Matrice carrée n × n rangée ligne par ligne. */
interface Matrix {
  n: number;
  cells: Float64Array;
}

function pivotRow(m: Matrix, col: number): number {
  let best = col;
  for (let r = col + 1; r < m.n; r++) {
    if (Math.abs(at(m.cells, r * m.n + col)) > Math.abs(at(m.cells, best * m.n + col))) best = r;
  }
  return best;
}

function swapRows(m: Matrix, b: Float64Array, r: number, s: number): void {
  if (r === s) return;
  for (let c = 0; c < m.n; c++) {
    const t = at(m.cells, r * m.n + c);
    m.cells[r * m.n + c] = at(m.cells, s * m.n + c);
    m.cells[s * m.n + c] = t;
  }
  const t = at(b, r);
  b[r] = at(b, s);
  b[s] = t;
}

function eliminateBelow(m: Matrix, b: Float64Array, col: number): void {
  const p = at(m.cells, col * m.n + col) || 1;
  for (let r = col + 1; r < m.n; r++) {
    const f = at(m.cells, r * m.n + col) / p;
    if (!f) continue;
    for (let c = col; c < m.n; c++) add(m.cells, r * m.n + c, -(f * at(m.cells, col * m.n + c)));
    add(b, r, -(f * at(b, col)));
  }
}

/** Résout A·x = b par élimination de Gauss avec pivot partiel (A et b modifiés en place). */
export function solveLinear(m: Matrix, b: Float64Array): Float64Array {
  for (let col = 0; col < m.n; col++) {
    swapRows(m, b, col, pivotRow(m, col));
    eliminateBelow(m, b, col);
  }
  const x = new Float64Array(m.n);
  for (let r = m.n - 1; r >= 0; r--) {
    let s = at(b, r);
    for (let c = r + 1; c < m.n; c++) s -= at(m.cells, r * m.n + c) * at(x, c);
    x[r] = s / (at(m.cells, r * m.n + r) || 1);
  }
  return x;
}

/** Ajuste la plaque mince sur des points [x, y, z]. */
export function solveThinPlate(points: [number, number, number][]): ThinPlate {
  const k = points.length;
  const m: Matrix = { n: k + 3, cells: new Float64Array((k + 3) * (k + 3)) };
  const b = new Float64Array(k + 3);
  points.forEach(([xi, yi, zi], i) => {
    points.forEach(([xj, yj], j) => {
      m.cells[i * m.n + j] = kernel(xi - xj, yi - yj) + (i === j ? SMOOTHING : 0);
    });
    [1, xi, yi].forEach((p, q) => {
      m.cells[i * m.n + k + q] = p;
      m.cells[(k + q) * m.n + i] = p;
    });
    b[i] = zi;
  });
  const w = solveLinear(m, b);
  return (x, y) => {
    let z = at(w, k) + at(w, k + 1) * x + at(w, k + 2) * y;
    points.forEach(([px, py], i) => (z += at(w, i) * kernel(x - px, y - py)));
    return z;
  };
}

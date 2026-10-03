import type { ClothModel } from './topology.js';
import type { Holds } from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

/**
 * Multiplicateurs de Lagrange XPBD (Macklin et al. 2016) : remis à zéro au début de chaque sous-pas, cumulés sur
 * les itérations du sous-pas (terme de souplesse `α̃·λ` de chaque contrainte).
 */
export interface Lambdas {
  stretch: Float64Array;
  /** 3 composantes par stencil de flexion. */
  bending: Float64Array;
  /** 3 composantes par couture. */
  stitches: Float64Array;
  /** 1 par tenue. */
  holds: Float64Array;
}

export function createLambdas(model: ClothModel, holds?: Holds): Lambdas {
  return {
    stretch: new Float64Array(model.edgeRestMm.length),
    bending: new Float64Array(3 * model.bendCompliance.length),
    stitches: new Float64Array(3 * (model.stitches.length / 2)),
    holds: new Float64Array(holds ? holds.vertices.length : 0),
  };
}

export function resetLambdas(l: Lambdas): void {
  l.stretch.fill(0);
  l.bending.fill(0);
  l.stitches.fill(0);
  l.holds.fill(0);
}

/** Étirement : contrainte de distance par arête, une passe de Gauss-Seidel dans l'ordre des arêtes (XPBD). */
export function solveStretch(
  model: ClothModel,
  x: Float64Array,
  invDt2: number,
  lambda: Float64Array,
): void {
  const { edgeVertices: ev, edgeRestMm: rest, edgeCompliance: comp, invMass: w } = model;
  for (let e = 0; e < rest.length; e++) {
    const a = u(ev, 2 * e);
    const b = u(ev, 2 * e + 1);
    const wa = f(w, a);
    const wb = f(w, b);
    const dx = f(x, 3 * a) - f(x, 3 * b);
    const dy = f(x, 3 * a + 1) - f(x, 3 * b + 1);
    const dz = f(x, 3 * a + 2) - f(x, 3 * b + 2);
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const alpha = f(comp, e) * invDt2;
    const denom = wa + wb + alpha;
    if (len < 1e-12 || denom <= 0) continue;
    const s = (-(len - f(rest, e)) - alpha * f(lambda, e)) / (denom * len);
    lambda[e] = f(lambda, e) + s * len;
    x[3 * a] = f(x, 3 * a) + wa * s * dx;
    x[3 * a + 1] = f(x, 3 * a + 1) + wa * s * dy;
    x[3 * a + 2] = f(x, 3 * a + 2) + wa * s * dz;
    x[3 * b] = f(x, 3 * b) - wb * s * dx;
    x[3 * b + 1] = f(x, 3 * b + 1) - wb * s * dy;
    x[3 * b + 2] = f(x, 3 * b + 2) - wb * s * dz;
  }
}

/**
 * Flexion isométrique (Bergou et al. 2006) : trois contraintes scalaires par stencil, C_c = Σ K_i · x_i,c,
 * de gradient K_i pour la composante c : matrice constante, sans trigonométrie.
 */
export function solveBending(
  model: ClothModel,
  x: Float64Array,
  invDt2: number,
  lambda: Float64Array,
): void {
  const { bendVertices: bv, bendWeights: bk, bendCompliance: comp, invMass: w } = model;
  for (let s = 0; s < comp.length; s++) {
    const alpha = f(comp, s) * invDt2;
    let denom = alpha;
    for (let k = 0; k < 4; k++)
      denom += f(w, u(bv, 4 * s + k)) * f(bk, 4 * s + k) * f(bk, 4 * s + k);
    if (denom <= 0) continue;
    for (let c = 0; c < 3; c++) {
      let value = 0;
      for (let k = 0; k < 4; k++) value += f(bk, 4 * s + k) * f(x, 3 * u(bv, 4 * s + k) + c);
      const dLambda = (-value - alpha * f(lambda, 3 * s + c)) / denom;
      lambda[3 * s + c] = f(lambda, 3 * s + c) + dLambda;
      for (let k = 0; k < 4; k++) {
        const i = 3 * u(bv, 4 * s + k) + c;
        x[i] = f(x, i) + f(w, u(bv, 4 * s + k)) * f(bk, 4 * s + k) * dLambda;
      }
    }
  }
}

/** Coutures : distance de longueur nulle entre sommets appariés (trois composantes indépendantes). */
export function solveStitches(
  model: ClothModel,
  x: Float64Array,
  soft: { compliance: number; invDt2: number },
  lambda: Float64Array,
): void {
  const { stitches: st, invMass: w } = model;
  const alpha = soft.compliance * soft.invDt2;
  for (let s = 0; s < st.length / 2; s++) {
    const a = u(st, 2 * s);
    const b = u(st, 2 * s + 1);
    const wa = f(w, a);
    const wb = f(w, b);
    const denom = wa + wb + alpha;
    if (denom <= 0) continue;
    for (let c = 0; c < 3; c++) {
      const dLambda = (-(f(x, 3 * a + c) - f(x, 3 * b + c)) - alpha * f(lambda, 3 * s + c)) / denom;
      lambda[3 * s + c] = f(lambda, 3 * s + c) + dLambda;
      x[3 * a + c] = f(x, 3 * a + c) + wa * dLambda;
      x[3 * b + c] = f(x, 3 * b + c) - wb * dLambda;
    }
  }
}

/**
 * Tenues : contrainte scalaire C = a·x − t par sommet tenu (axe unitaire a, cible t en mm). Δλ = (−C − α̃λ)/(w + α̃).
 * Résolues après les coutures ; `soft.compliance` est la souplesse de la tenue (déjà divisée par le relâchement).
 */
export function solveHolds(
  model: { invMass: Float64Array; holds: Holds },
  x: Float64Array,
  soft: { compliance: number; invDt2: number },
  lambda: Float64Array,
): void {
  const { vertices, axes, targetsMm } = model.holds;
  const alpha = soft.compliance * soft.invDt2;
  for (let h = 0; h < vertices.length; h++) {
    const i = u(vertices, h);
    const w = f(model.invMass, i);
    if (w + alpha <= 0) continue;
    const c =
      f(axes, 3 * h) * f(x, 3 * i) +
      f(axes, 3 * h + 1) * f(x, 3 * i + 1) +
      f(axes, 3 * h + 2) * f(x, 3 * i + 2) -
      f(targetsMm, h);
    const dLambda = (-c - alpha * f(lambda, h)) / (w + alpha);
    lambda[h] = f(lambda, h) + dLambda;
    for (let k = 0; k < 3; k++) x[3 * i + k] = f(x, 3 * i + k) + w * f(axes, 3 * h + k) * dLambda;
  }
}

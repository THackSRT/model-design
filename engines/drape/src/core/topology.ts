import type { XpbdParams } from './fabric.js';
import type { ClothMesh } from './types.js';

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;
const u = (a: Uint32Array, i: number): number => a[i] as number;

/** Modèle précalculé du tissu : masses, arêtes d'étirement, stencils de flexion, coutures. */
export interface ClothModel {
  vertexCount: number;
  mass: Float64Array;
  invMass: Float64Array;
  edgeVertices: Uint32Array; // 2 par arête
  edgeRestMm: Float64Array;
  edgeCompliance: Float64Array; // souplesse 1/k, mm·s²/g
  bendVertices: Uint32Array; // 4 par stencil : arête (v0, v1), sommets opposés (v2, v3)
  bendWeights: Float64Array; // 4 par stencil : K
  bendCompliance: Float64Array;
  stitches: Uint32Array;
  /** Souplesse moyenne d'une arête, base de la souplesse des coutures. */
  meanEdgeCompliance: number;
}

interface EdgeInfo {
  a: number;
  b: number;
  opposite: number[];
  areas: number[];
  grainCos2: number;
}

function triangleAreaMm2(flat: Float64Array, a: number, b: number, c: number): number {
  const ux = f(flat, 2 * b) - f(flat, 2 * a);
  const uy = f(flat, 2 * b + 1) - f(flat, 2 * a + 1);
  const vx = f(flat, 2 * c) - f(flat, 2 * a);
  const vy = f(flat, 2 * c + 1) - f(flat, 2 * a + 1);
  return 0.5 * Math.abs(ux * vy - uy * vx);
}

function grainCos2(cloth: ClothMesh, t: number, a: number, b: number): number {
  const dx = f(cloth.flatMm, 2 * b) - f(cloth.flatMm, 2 * a);
  const dy = f(cloth.flatMm, 2 * b + 1) - f(cloth.flatMm, 2 * a + 1);
  const len2 = dx * dx + dy * dy;
  if (len2 <= 0) return 0;
  const dot = dx * f(cloth.grainUnit, 2 * t) + dy * f(cloth.grainUnit, 2 * t + 1);
  return Math.min(1, (dot * dot) / len2);
}

/** Arêtes uniques, dans l'ordre de première apparition (déterministe). */
function collectEdges(cloth: ClothMesh): EdgeInfo[] {
  const n = cloth.flatMm.length / 2;
  const byKey = new Map<number, EdgeInfo>();
  const tri = cloth.triangles;
  for (let t = 0; t < tri.length / 3; t++) {
    const v = [u(tri, 3 * t), u(tri, 3 * t + 1), u(tri, 3 * t + 2)] as const;
    const area = triangleAreaMm2(cloth.flatMm, v[0], v[1], v[2]);
    for (let k = 0; k < 3; k++) {
      const p = v[k] as number;
      const q = v[(k + 1) % 3] as number;
      const opp = v[(k + 2) % 3] as number;
      const a = Math.min(p, q);
      const b = Math.max(p, q);
      const key = a * n + b;
      let e = byKey.get(key);
      if (!e) {
        e = { a, b, opposite: [], areas: [], grainCos2: grainCos2(cloth, t, a, b) };
        byKey.set(key, e);
      }
      e.opposite.push(opp);
      e.areas.push(area);
    }
  }
  return [...byKey.values()];
}

function vertexMasses(
  cloth: ClothMesh,
  massPerArea: number,
): { mass: Float64Array; invMass: Float64Array } {
  const n = cloth.flatMm.length / 2;
  const mass = new Float64Array(n);
  const tri = cloth.triangles;
  for (let t = 0; t < tri.length / 3; t++) {
    const [a, b, c] = [u(tri, 3 * t), u(tri, 3 * t + 1), u(tri, 3 * t + 2)];
    const third = (triangleAreaMm2(cloth.flatMm, a, b, c) / 3) * massPerArea;
    for (const v of [a, b, c]) mass[v] = f(mass, v) + third;
  }
  const invMass = new Float64Array(n);
  for (let i = 0; i < n; i++) invMass[i] = f(mass, i) > 0 ? 1 / f(mass, i) : 0;
  for (const p of cloth.pinned ?? []) invMass[p] = 0;
  return { mass, invMass };
}

/** cot de l'angle entre u et v (plan), 0 si dégénéré. */
function cot(ux: number, uy: number, vx: number, vy: number): number {
  const cross = Math.abs(ux * vy - uy * vx);
  return cross > 1e-12 ? (ux * vx + uy * vy) / cross : 0;
}

/**
 * Poids K du stencil de flexion isométrique (Bergou et al. 2006, forme de Garg et al.) : somme des K·x nulle sur
 * un état plat. Énergie ½·k·|ΣK·x|² avec k = D/(A0+A1) : la forme de Bergou (3/(A0+A1)) surestime d'un facteur 3
 * l'énergie continue ½·D·κ² par unité d'aire (vérifié sur un cylindre, mailles de 2,5 à 10 mm : rapport 2,7 à 2,9,
 * tendant vers 3), d'où le 1/3.
 */
export function bendingWeights(
  flat: Float64Array,
  v: readonly [number, number, number, number],
): number[] {
  const p = (i: number, c: number): number => f(flat, 2 * i + c);
  const d = (from: number, to: number, c: number): number => p(to, c) - p(from, c);
  const [v0, v1, v2, v3] = v;
  const c01 = cot(d(v0, v1, 0), d(v0, v1, 1), d(v0, v2, 0), d(v0, v2, 1));
  const c02 = cot(d(v0, v1, 0), d(v0, v1, 1), d(v0, v3, 0), d(v0, v3, 1));
  const c03 = cot(d(v1, v0, 0), d(v1, v0, 1), d(v1, v2, 0), d(v1, v2, 1));
  const c04 = cot(d(v1, v0, 0), d(v1, v0, 1), d(v1, v3, 0), d(v1, v3, 1));
  return [c03 + c04, c01 + c02, -c01 - c03, -c02 - c04];
}

function edgeLength(flat: Float64Array, a: number, b: number): number {
  const dx = f(flat, 2 * b) - f(flat, 2 * a);
  const dy = f(flat, 2 * b + 1) - f(flat, 2 * a + 1);
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Raideur d'une arête : k = K(θ) · A / l², avec K(θ) interpolée entre trame et chaîne par cos² de l'angle au droit
 * fil, et A l'aire tributaire de l'arête (somme des triangles adjacents, doublée pour une arête de bord).
 */
function stretchStiffness(e: EdgeInfo, lengthMm: number, p: XpbdParams): number {
  const count = e.areas.length;
  const area = (e.areas.reduce((s, a) => s + a, 0) * 2) / count;
  const k = e.grainCos2 * p.stretchWarpGPerS2 + (1 - e.grainCos2) * p.stretchWeftGPerS2;
  return (k * area) / (lengthMm * lengthMm);
}

export function buildClothModel(cloth: ClothMesh, params: XpbdParams): ClothModel {
  const edges = collectEdges(cloth).filter((e) => edgeLength(cloth.flatMm, e.a, e.b) > 1e-9);
  const edgeVertices = new Uint32Array(edges.length * 2);
  const edgeRestMm = new Float64Array(edges.length);
  const edgeCompliance = new Float64Array(edges.length);
  let complianceSum = 0;
  edges.forEach((e, i) => {
    const len = edgeLength(cloth.flatMm, e.a, e.b);
    edgeVertices[2 * i] = e.a;
    edgeVertices[2 * i + 1] = e.b;
    edgeRestMm[i] = len;
    edgeCompliance[i] = 1 / stretchStiffness(e, len, params);
    complianceSum += f(edgeCompliance, i);
  });
  const bend = buildBending(cloth, edges, params);
  return {
    vertexCount: cloth.flatMm.length / 2,
    ...vertexMasses(cloth, params.massPerAreaGPerMm2),
    edgeVertices,
    edgeRestMm,
    edgeCompliance,
    ...bend,
    stitches: cloth.stitches,
    meanEdgeCompliance: edges.length > 0 ? complianceSum / edges.length : 1,
  };
}

function buildBending(
  cloth: ClothMesh,
  edges: EdgeInfo[],
  params: XpbdParams,
): Pick<ClothModel, 'bendVertices' | 'bendWeights' | 'bendCompliance'> {
  const inner = edges.filter((e) => e.opposite.length === 2);
  const bendVertices = new Uint32Array(inner.length * 4);
  const bendWeights = new Float64Array(inner.length * 4);
  const bendCompliance = new Float64Array(inner.length);
  inner.forEach((e, i) => {
    const v: [number, number, number, number] = [
      e.a,
      e.b,
      e.opposite[0] as number,
      e.opposite[1] as number,
    ];
    const k = bendingWeights(cloth.flatMm, v);
    for (let j = 0; j < 4; j++) {
      bendVertices[4 * i + j] = v[j] as number;
      bendWeights[4 * i + j] = k[j] as number;
    }
    const stiffness = params.bendingGMm2PerS2 / ((e.areas[0] as number) + (e.areas[1] as number));
    bendCompliance[i] = 1 / stiffness;
  });
  return { bendVertices, bendWeights, bendCompliance };
}

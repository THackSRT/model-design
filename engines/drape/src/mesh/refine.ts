import { assertVertexBudget } from './limits.js';
import type { Triangulation } from './triangulation.js';

// Raffinement : les arêtes intérieures plus longues que `maxLengthMm` reçoivent un sommet en leur milieu (le milieu
// d'une arête intérieure est toujours dans la pièce). Passes en ordre fixe, au plus MAX_PASSES.

const MAX_PASSES = 8;

function length(tr: Triangulation, a: number, b: number): number {
  const p = tr.pts;
  const dx = (p[2 * a] as number) - (p[2 * b] as number);
  const dy = (p[2 * a + 1] as number) - (p[2 * b + 1] as number);
  return Math.sqrt(dx * dx + dy * dy);
}

/** Arêtes intérieures trop longues (une seule fois chacune), triangles `inside` à 1. */
function longEdges(tr: Triangulation, inside: Int8Array, maxLengthMm: number): number[][] {
  const out: number[][] = [];
  for (let t = 0; t < tr.triangleCount; t++) {
    if (inside[t] !== 1) continue;
    for (let k = 0; k < 3; k++) {
      const u = tr.nb[3 * t + k] as number;
      const a = tr.v[3 * t + ((k + 1) % 3)] as number;
      const b = tr.v[3 * t + ((k + 2) % 3)] as number;
      if (u > t && !tr.isConstrained(a, b) && length(tr, a, b) > maxLengthMm) out.push([a, b]);
    }
  }
  return out;
}

/** Scinde les arêtes intérieures plus longues que `maxLengthMm`. `classify` donne 1 aux triangles de la pièce. */
export function splitLongEdges(
  tr: Triangulation,
  classify: (tr: Triangulation) => Int8Array,
  maxLengthMm: number,
  maxVertices: number,
): void {
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const edges = longEdges(tr, classify(tr), maxLengthMm);
    if (edges.length === 0) return;
    for (const [a, b] of edges as [number, number][]) {
      if (tr.edgeTri(a, b) < 0 || length(tr, a, b) <= maxLengthMm) continue;
      const p = tr.pts;
      const mid = tr.addPoint(
        ((p[2 * a] as number) + (p[2 * b] as number)) / 2,
        ((p[2 * a + 1] as number) + (p[2 * b + 1] as number)) / 2,
      );
      assertVertexBudget(tr.vertexCount - 3, maxVertices);
      tr.insert(mid);
    }
  }
}

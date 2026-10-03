import type { Edge, Panel, Point } from '@atelier/contracts-ts';
import { InvalidInputError } from '../core/validate.js';

// Dépliage d'une pièce coupée sur pliure (ADR 0013) : symétrie sur la droite du bord de rôle `fold`. Millimètres.

/** Droite du pli : un point et la direction unitaire du bord `fold` (de son début vers sa fin). */
export interface FoldLine {
  px: number;
  py: number;
  ux: number;
  uy: number;
}

export interface UnfoldedPanel {
  /** Contour complet (antihoraire) : les bords d'origine sans le pli, puis leurs symétriques en ordre inverse. */
  panel: Panel;
  /** Pour chaque bord du contour déplié : bord d'origine (index dans `panel.edges`) et moitié symétrique ou non. */
  edgeOrigin: readonly { edgeIndex: number; mirrored: boolean }[];
  fold: FoldLine;
}

/** Distance au pli sous laquelle un point est sur le pli (il reste alors à sa place exacte). */
const ON_FOLD_MM = 1e-6;

function reflector(fold: FoldLine): (p: Point) => Point {
  return (p) => {
    const wx = p[0] - fold.px;
    const wy = p[1] - fold.py;
    const t = wx * fold.ux + wy * fold.uy;
    const dx = wx - t * fold.ux;
    const dy = wy - t * fold.uy;
    if (Math.abs(dx) + Math.abs(dy) <= ON_FOLD_MM) return p;
    return [p[0] - 2 * dx, p[1] - 2 * dy];
  };
}

function mirrorEdge(e: Edge, reflect: (p: Point) => Point): Edge {
  const c = e.controls ?? [];
  const controls: Edge['controls'] =
    c.length === 2 ? [reflect(c[1]), reflect(c[0])] : c.length === 1 ? [reflect(c[0])] : undefined;
  const mirrored: Edge = { id: `${e.id}@fold`, from: reflect(e.to), to: reflect(e.from) };
  if (controls !== undefined) mirrored.controls = controls;
  if (e.role !== undefined) mirrored.role = e.role;
  return mirrored;
}

/** Index du bord `fold` d'une pièce `cutOnFold` ; `InvalidInputError` s'il manque, est double ou courbe. */
function foldEdgeIndex(panel: Panel): number {
  const idx = panel.edges.flatMap((e, i) => (e.role === 'fold' ? [i] : []));
  if (idx.length !== 1) {
    throw new InvalidInputError('mesh', `panel ${panel.id}: cutOnFold needs exactly one fold edge`);
  }
  const edge = panel.edges[idx[0] as number] as Edge;
  if ((edge.controls?.length ?? 0) > 0) {
    throw new InvalidInputError('mesh', `panel ${panel.id}: the fold edge must be straight`);
  }
  return idx[0] as number;
}

/**
 * Déplie une pièce coupée sur pliure. Les sommets du pli ne sont pas doublés : le pli est le début et la fin de la
 * chaîne d'origine, que la chaîne symétrique referme avec les mêmes points (coordonnées reprises à l'identique).
 */
export function unfoldPanel(panel: Panel): UnfoldedPanel {
  const n = panel.edges.length;
  const foldIdx = foldEdgeIndex(panel);
  const foldEdge = panel.edges[foldIdx] as Edge;
  const dx = foldEdge.to[0] - foldEdge.from[0];
  const dy = foldEdge.to[1] - foldEdge.from[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (!(len > 1e-9))
    throw new InvalidInputError('mesh', `panel ${panel.id}: the fold has no length`);
  const fold: FoldLine = { px: foldEdge.from[0], py: foldEdge.from[1], ux: dx / len, uy: dy / len };
  const reflect = reflector(fold);
  const chain: number[] = [];
  for (let k = 1; k < n; k++) chain.push((foldIdx + k) % n);
  const edges: Edge[] = chain.map((i) => panel.edges[i] as Edge);
  const edgeOrigin = chain.map((i) => ({ edgeIndex: i, mirrored: false }));
  for (let k = chain.length - 1; k >= 0; k--) {
    const m = mirrorEdge(edges[k] as Edge, reflect);
    if (k === chain.length - 1) m.from = (edges[k] as Edge).to;
    if (k === 0) m.to = (edges[0] as Edge).from;
    edges.push(m);
    edgeOrigin.push({ edgeIndex: chain[k] as number, mirrored: true });
  }
  const unfolded = { ...panel, edges: edges as Panel['edges'], cutOnFold: false };
  return { panel: unfolded, edgeOrigin, fold };
}

/** Vrai si le point (x, y) est sur la moitié d'origine (à gauche du pli, de son début vers sa fin). */
export function onOriginalHalf(fold: FoldLine, x: number, y: number): boolean {
  return fold.ux * (y - fold.py) - fold.uy * (x - fold.px) >= 0;
}

/** Symétrique d'un vecteur (droit fil) par rapport à la direction du pli. */
export function reflectVector(fold: FoldLine, vx: number, vy: number): [number, number] {
  const t = vx * fold.ux + vy * fold.uy;
  return [2 * t * fold.ux - vx, 2 * t * fold.uy - vy];
}

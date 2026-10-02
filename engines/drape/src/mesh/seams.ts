import type { Edge, Seam } from '@atelier/contracts-ts';
import { InvalidInputError } from '../core/validate.js';
import { edgeSide, type PanelPlan, type Side } from './copies.js';
import { MAX_EDGES_PER_GARMENT } from './limits.js';
import { edgeSampling } from './outline.js';

// Coutures : bords du contrat → exemplaires de bords, appariement point à point (ADR 0013). Pur, mm.

/** Un bord d'un exemplaire de pièce, tel qu'il est maillé. */
export interface EdgeInstance {
  /** Index de la pièce dans `spec.panels`. */
  plan: number;
  copy: 0 | 1;
  /** Index du bord dans le contour maillé (déplié pour une pièce sur pliure). */
  contourEdge: number;
  side: Side;
}

/** Une couture résolue entre deux exemplaires de bords (`a` et `b` du contrat). */
export interface SeamPair {
  seam: Seam;
  a: EdgeInstance;
  b: EdgeInstance;
}

const keyOf = (panelId: string, edgeId: string): string => `${panelId}\u0000${edgeId}`;

/** Index des exemplaires de bords par (pièce, bord du contrat). Le bord `fold` d'une pièce dépliée n'existe plus. */
export function indexEdges(plans: readonly PanelPlan[]): Map<string, EdgeInstance[]> {
  const index = new Map<string, EdgeInstance[]>();
  plans.forEach((plan, p) => {
    const seen = new Set<string>();
    for (const e of plan.panel.edges) {
      if (seen.has(e.id)) {
        throw new InvalidInputError('mesh', `panel ${plan.panel.id}: duplicate edge id ${e.id}`);
      }
      seen.add(e.id);
    }
    plan.contour.edges.forEach((_, contourEdge) => {
      const origin = plan.edgeOrigin[contourEdge] as { edgeIndex: number };
      const key = keyOf(plan.panel.id, (plan.panel.edges[origin.edgeIndex] as { id: string }).id);
      const list = index.get(key) ?? [];
      for (let copy = 0; copy < plan.copies; copy++) {
        const c = copy as 0 | 1;
        list.push({ plan: p, copy: c, contourEdge, side: edgeSide(plan, c, contourEdge) });
      }
      index.set(key, list);
    });
  });
  return index;
}

function candidates(
  index: ReadonlyMap<string, EdgeInstance[]>,
  ref: Seam['a'],
  seam: Seam,
): EdgeInstance[] {
  const all = index.get(keyOf(ref.panelId, ref.edgeId));
  if (all === undefined) {
    throw new InvalidInputError(
      'mesh',
      `seam ${seam.id}: unknown edge ${ref.panelId}/${ref.edgeId} (or fold edge)`,
    );
  }
  const found = ref.side === undefined ? all : all.filter((i) => i.side === ref.side);
  if (found.length === 0) {
    throw new InvalidInputError(
      'mesh',
      `seam ${seam.id}: edge ${ref.panelId}/${ref.edgeId} has no ${String(ref.side)} copy`,
    );
  }
  return found;
}

/** Même côté que `single` parmi `pair` (deux exemplaires, un par côté). */
function sameSide(seam: Seam, single: EdgeInstance, pair: readonly EdgeInstance[]): EdgeInstance {
  const match = pair.find((i) => i.side === single.side);
  if (single.side === 'center' || match === undefined) {
    throw new InvalidInputError(
      'mesh',
      `seam ${seam.id}: cannot choose between the two copies of an edge (use EdgeRef.side)`,
    );
  }
  return match;
}

/**
 * Résout une couture en paires d'exemplaires : deux exemplaires uniques s'apparient ; deux bords à deux
 * exemplaires s'apparient côté par côté ; un bord à deux exemplaires et un bord unique : la copie du côté du
 * second. `EdgeRef.side` restreint d'abord les exemplaires du bord.
 */
export function resolveSeam(index: ReadonlyMap<string, EdgeInstance[]>, seam: Seam): SeamPair[] {
  const as = candidates(index, seam.a, seam);
  const bs = candidates(index, seam.b, seam);
  if (as.length > 2 || bs.length > 2) {
    throw new InvalidInputError('mesh', `seam ${seam.id}: more than two copies of an edge`);
  }
  const [a0, b0] = [as[0] as EdgeInstance, bs[0] as EdgeInstance];
  if (as.length === 1 && bs.length === 1) return [{ seam, a: a0, b: b0 }];
  if (as.length === 1) return [{ seam, a: a0, b: sameSide(seam, a0, bs) }];
  if (bs.length === 1) return [{ seam, a: sameSide(seam, b0, as), b: b0 }];
  return (['left', 'right'] as const).map((side) => {
    const a = as.find((i) => i.side === side);
    const b = bs.find((i) => i.side === side);
    if (a === undefined || b === undefined) {
      throw new InvalidInputError('mesh', `seam ${seam.id}: copies do not match side by side`);
    }
    return { seam, a, b };
  });
}

export function resolveSeams(
  plans: readonly PanelPlan[],
  seams: readonly Seam[],
): { pairs: SeamPair[]; index: Map<string, EdgeInstance[]> } {
  const index = indexEdges(plans);
  const pairs = seams.flatMap((seam) => resolveSeam(index, seam));
  return { pairs, index };
}

class Components {
  private readonly parent = new Map<number, number>();
  find(x: number): number {
    let r = x;
    while ((this.parent.get(r) ?? r) !== r) r = this.parent.get(r) as number;
    this.parent.set(x, r);
    return r;
  }
  union(a: number, b: number): void {
    const [ra, rb] = [this.find(a), this.find(b)];
    if (ra !== rb) this.parent.set(Math.max(ra, rb), Math.min(ra, rb));
  }
}

/**
 * Nombre de parts imposé aux bords cousus, par pièce puis par bord du contour. Les bords reliés par des coutures
 * (de proche en proche : un bord peut être cousu à plusieurs autres, et un exemplaire miroir partage le maillage de
 * son original) forment un groupe : tous reçoivent n = ceil(plus grande longueur / h) parts, ou plus si la flèche
 * d'un bord courbe l'exige. Un bord sans couture garde son pas naturel.
 */
export function seamSegmentCounts(
  plans: readonly PanelPlan[],
  pairs: readonly SeamPair[],
  edgeMm: number,
): Map<number, Map<number, number>> {
  const stride = MAX_EDGES_PER_GARMENT + 1;
  const id = (i: EdgeInstance): number => i.plan * stride + i.contourEdge;
  const groups = new Components();
  for (const { a, b } of pairs) groups.union(id(a), id(b));
  const need = new Map<number, number>();
  const seen = new Set<number>();
  for (const { a, b } of pairs) {
    for (const inst of [a, b]) {
      if (seen.has(id(inst))) continue;
      seen.add(id(inst));
      const plan = plans[inst.plan] as PanelPlan;
      const s = edgeSampling(plan.contour.edges[inst.contourEdge] as Edge, edgeMm);
      const root = groups.find(id(inst));
      need.set(root, Math.max(need.get(root) ?? 1, Math.ceil(s.lengthMm / edgeMm), s.segments));
    }
  }
  const out = new Map<number, Map<number, number>>();
  for (const key of [...seen].sort((x, y) => x - y)) {
    const plan = Math.floor(key / stride);
    const edges = out.get(plan) ?? new Map<number, number>();
    edges.set(key % stride, need.get(groups.find(key)) as number);
    out.set(plan, edges);
  }
  return out;
}

export interface SeamReport {
  seamId: string;
  /** Côté du porteur de l'exemplaire de `a` et de `b`. */
  sideA: Side;
  sideB: Side;
  /** Longueurs aplaties des deux bords maillés, en mm. */
  lengthAMm: number;
  lengthBMm: number;
  /** Embu du contrat (0 si absent). */
  easeMm: number;
  /** |longueur de a − longueur de b − embu| : écart à la couture voulue (le moteur de drapé signale seam-not-closed). */
  mismatchMm: number;
  /** Premier couple de `stitches` de cette couture, et nombre de couples. */
  stitchStart: number;
  stitchCount: number;
}

function polylineLength(flatMm: Float64Array, vertices: Uint32Array): number {
  let s = 0;
  for (let i = 1; i < vertices.length; i++) {
    const p = vertices[i - 1] as number;
    const q = vertices[i] as number;
    const dx = (flatMm[2 * q] as number) - (flatMm[2 * p] as number);
    const dy = (flatMm[2 * q + 1] as number) - (flatMm[2 * p + 1] as number);
    s += Math.sqrt(dx * dx + dy * dy);
  }
  return s;
}

/**
 * Couples de sommets à coudre. `vertices(inst)` donne les sommets globaux du bord dans le sens du parcours de
 * l'exemplaire (antihoraire une fois posé) ; les deux bords vont en sens opposés : le point de rang i de `a` est
 * cousu au point de rang n − i de `b`. Un couple dont les deux sommets sont confondus (pointe d'une pince) est omis.
 */
export function sewPairs(
  pairs: readonly SeamPair[],
  vertices: (inst: EdgeInstance) => Uint32Array,
  flatMm: Float64Array,
): { stitches: Uint32Array; reports: SeamReport[] } {
  const out: number[] = [];
  const reports: SeamReport[] = [];
  for (const { seam, a, b } of pairs) {
    const va = vertices(a);
    const vb = vertices(b);
    if (va.length !== vb.length) {
      throw new InvalidInputError('mesh', `seam ${seam.id}: edges have different point counts`);
    }
    const start = out.length / 2;
    const n = va.length - 1;
    for (let i = 0; i <= n; i++) {
      const x = va[i] as number;
      const y = vb[n - i] as number;
      if (x !== y) out.push(x, y);
    }
    const lengthAMm = polylineLength(flatMm, va);
    const lengthBMm = polylineLength(flatMm, vb);
    const easeMm = seam.easeMm ?? 0;
    reports.push({
      seamId: seam.id,
      sideA: a.side,
      sideB: b.side,
      lengthAMm,
      lengthBMm,
      easeMm,
      mismatchMm: Math.abs(lengthAMm - lengthBMm - easeMm),
      stitchStart: start,
      stitchCount: out.length / 2 - start,
    });
  }
  return { stitches: Uint32Array.from(out), reports };
}

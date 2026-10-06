import { cubicLengthMm, distanceMm } from './curve.js';
import { ContourError } from './errors.js';
import type { Contour, DrawOp, PathOp, PointMm, Segment } from './types.js';

/**
 * Écart permis, sur chaque axe, pour confondre un point nommé et un sommet du contour (0,01 mm, essai de
 * FreeSewing : 129 441 sommets contrôlés, tous nommés à cette tolérance).
 */
export const SNAP_TOLERANCE_MM = 0.01;

/** Un segment plus court est ignoré (point répété par FreeSewing). */
const ZERO_LENGTH_MM = 1e-6;

export function isNear(a: PointMm, b: PointMm, toleranceMm = SNAP_TOLERANCE_MM): boolean {
  return Math.abs(a.xMm - b.xMm) <= toleranceMm && Math.abs(a.yMm - b.yMm) <= toleranceMm;
}

const isFinitePoint = (p: PointMm): boolean => Number.isFinite(p.xMm) && Number.isFinite(p.yMm);

/** Construit un contour opération par opération ; `finish` vérifie qu'il est fermé. */
class ContourBuilder {
  private readonly vertices: PointMm[] = [];
  private readonly segments: Segment[] = [];
  private current: PointMm | undefined;
  private start: PointMm | undefined;
  closed = false;

  constructor(private readonly part: string) {}

  apply(op: PathOp): void {
    if (op.type === 'move') this.move(op.to);
    else this.draw(op);
  }

  finish(): Contour {
    if (this.segments.length < 2)
      throw new ContourError(this.part, 'contour has less than two segments');
    const first = this.vertices[0] as PointMm;
    const last = this.vertices[this.vertices.length - 1] as PointMm;
    if (!isNear(first, last)) throw new ContourError(this.part, 'contour is not closed');
    // Fermé : le dernier sommet se confond avec le premier, le dernier segment y revient.
    const lastSegment = this.segments[this.segments.length - 1] as Segment;
    return {
      vertices: this.vertices.slice(0, -1),
      segments: [...this.segments.slice(0, -1), { ...lastSegment, to: 0 }],
    };
  }

  private move(to: PointMm): void {
    this.assertFinite(to);
    if (this.current === undefined) {
      this.current = to;
      this.start = to;
      this.vertices.push(to);
    } else if (!isNear(this.current, to)) {
      throw new ContourError(
        this.part,
        'contour has a second sub-path (move away from the current point)',
      );
    }
  }

  private draw(op: DrawOp): void {
    const from = this.current;
    const start = this.start;
    if (from === undefined || start === undefined) {
      throw new ContourError(this.part, 'drawing operation before the first move');
    }
    const to = op.type === 'close' ? start : op.to;
    this.assertFinite(to);
    const lengthMm = this.lengthOf(from, op, to);
    if (lengthMm > ZERO_LENGTH_MM) {
      this.segments.push(this.segmentOf(op, lengthMm));
      this.vertices.push(to);
    }
    this.current = to;
    if (op.type === 'close') this.closed = true;
  }

  private lengthOf(from: PointMm, op: DrawOp, to: PointMm): number {
    if (op.type !== 'curve') return distanceMm(from, to);
    this.assertFinite(op.cp1);
    this.assertFinite(op.cp2);
    return cubicLengthMm(from, op.cp1, op.cp2, to);
  }

  private segmentOf(op: DrawOp, lengthMm: number): Segment {
    const from = this.vertices.length - 1;
    const base = { from, to: from + 1, lengthMm };
    return op.type === 'curve'
      ? { kind: 'curve', ...base, cp1: op.cp1, cp2: op.cp2 }
      : { kind: 'line', ...base };
  }

  private assertFinite(point: PointMm): void {
    if (!isFinitePoint(point))
      throw new ContourError(this.part, 'contour has a non-finite coordinate');
  }
}

/**
 * Découpe le contour de couture (`paths.seam`) d'une pièce en segments : une ligne ou une courbe de Bézier cubique
 * entre deux sommets. Les segments de longueur nulle sont ignorés. Le contour doit être fermé, sans sous-chemin.
 * Rend les sommets et les segments (longueurs brutes) ; l'arrondi se fait en sortie.
 */
export function extractContour(part: string, ops: readonly PathOp[] | undefined): Contour {
  if (ops === undefined) throw new ContourError(part, 'the part has no seam path (paths.seam)');
  const builder = new ContourBuilder(part);
  for (const op of ops) {
    builder.apply(op);
    if (builder.closed) break;
  }
  return builder.finish();
}

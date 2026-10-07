import { SeamError } from './errors.js';
import { reversePiece, splitPiece } from './pieces.js';
import type { Piece } from './pieces.js';

/** Un bord parcouru par une couture : ses pièces dans le sens du contour, et s'il est parcouru à l'envers. */
export interface WalkEdge {
  readonly pieces: readonly Piece[];
  readonly reversed: boolean;
}

/** Ce que rend `pairWalks` pour un côté de la couture. */
export interface CutSide {
  /** Les pièces de chaque bord du parcours après découpe, dans le sens du contour. */
  readonly edges: readonly (readonly Piece[])[];
  /** Toutes les pièces du parcours dans l'ordre où il les suit (celles de `edges`, par identité). */
  readonly walked: readonly Piece[];
}

/** Deux côtés découpés, et leurs pièces cousues deux à deux dans l'ordre du parcours. */
export interface Pairing {
  readonly a: CutSide;
  readonly b: CutSide;
  readonly pairs: readonly (readonly [Piece, Piece])[];
}

/**
 * Deux limites de pièces, une de chaque côté, plus proches que cette part de la longueur de la couture sont confondues :
 * pas de pièce de quelques dixièmes de millimètre que l'autre côté n'aurait pas (0,25 mm sur une emmanchure de 617 mm).
 * Les deux pièces qui se cousent alors diffèrent de cet écart au plus ; la couture entière reste exacte.
 */
export const MERGE_FRACTION = 4e-4;

/** Une pièce du parcours, dans le sens du parcours, avec son abscisse de début et de fin le long de lui. */
interface Stretch {
  readonly edge: number;
  readonly piece: Piece;
  readonly from: number;
  readonly to: number;
}

interface Walk {
  readonly stretches: readonly Stretch[];
  readonly total: number;
}

/** Un côté de la couture : ses bords et leur parcours. */
interface Side {
  readonly edges: readonly WalkEdge[];
  readonly walk: Walk;
}

function walkOf(edges: readonly WalkEdge[]): Walk {
  const stretches: Stretch[] = [];
  let at = 0;
  edges.forEach((edge, index) => {
    const oriented = edge.reversed ? [...edge.pieces].reverse().map(reversePiece) : edge.pieces;
    for (const piece of oriented) {
      stretches.push({ edge: index, piece, from: at, to: at + piece.lengthMm });
      at += piece.lengthMm;
    }
  });
  return { stretches, total: at };
}

/** Points de découpe de la couture et place des limites de pièces de chaque parcours parmi eux. */
interface Plan {
  /** Fractions de la longueur de la couture, de 0 à 1, croissantes. */
  readonly points: readonly number[];
  /** Par parcours : indice (dans `points`) de chaque limite de pièce, de son début à sa fin. */
  readonly limits: readonly (readonly number[])[];
}

/**
 * Regroupe les limites de pièces des deux parcours en points de découpe. Les extrémités (0 et 1) sont chacune un point.
 * Deux limites intérieures se confondent si leur écart est d'au plus `MERGE_FRACTION`, mais jamais deux limites d'un même
 * parcours : une pièce, si courte soit-elle, garde ses deux extrémités distinctes, donc chaque tronçon enjambe au moins un
 * intervalle et les deux côtés ont autant de pièces.
 */
function planOf(walks: readonly Walk[]): Plan {
  const interior = walks
    .flatMap((walk, side) =>
      walk.stretches.slice(1).map((stretch) => ({ side, fraction: stretch.from / walk.total })),
    )
    .sort((p, q) => p.fraction - q.fraction || p.side - q.side);
  const points = [0];
  const limits = walks.map(() => [0]);
  let open: { rep: number; sides: Set<number> } | undefined;
  for (const { side, fraction } of interior) {
    if (open === undefined || fraction - open.rep > MERGE_FRACTION || open.sides.has(side)) {
      points.push(fraction);
      open = { rep: fraction, sides: new Set() };
    }
    open.sides.add(side);
    (limits[side] as number[]).push(points.length - 1);
  }
  points.push(1);
  limits.forEach((own) => own.push(points.length - 1));
  return { points, limits };
}

/** Les pièces d'un tronçon, coupé aux points de découpe qu'il enjambe (distances depuis son début). */
function cutStretch(stretch: Stretch, cuts: readonly number[], seam: string): Piece[] {
  const pieces: Piece[] = [];
  let rest = stretch.piece;
  let used = 0;
  for (const cut of cuts) {
    if (!(cut - used > 0 && cut < stretch.piece.lengthMm)) {
      throw new SeamError(seam, 'a cut point falls outside the piece it should cut');
    }
    const [head, tail] = splitPiece(rest, cut - used);
    pieces.push(head);
    rest = tail;
    used = cut;
  }
  return [...pieces, rest];
}

function cutSide(side: Side, plan: Plan, rank: number, seam: string): CutSide {
  const { edges, walk } = side;
  const own = plan.limits[rank] as readonly number[];
  const perEdge: Piece[][] = edges.map(() => []);
  const walked: Piece[] = [];
  walk.stretches.forEach((stretch, index) => {
    const inside = plan.points.slice((own[index] as number) + 1, own[index + 1]);
    const cuts = inside.map((fraction) => fraction * walk.total - stretch.from);
    const pieces = cutStretch(stretch, cuts, seam);
    const edge = edges[stretch.edge] as WalkEdge;
    const inContourDirection = edge.reversed ? pieces.map(reversePiece) : pieces;
    walked.push(...inContourDirection);
    (perEdge[stretch.edge] as Piece[]).push(...inContourDirection);
  });
  edges.forEach((edge, index) => {
    if (edge.reversed) (perEdge[index] as Piece[]).reverse();
  });
  return { edges: perEdge, walked };
}

/**
 * Apparie deux parcours de bords cousus l'un à l'autre. Chaque parcours est coupé aux fractions de sa longueur où l'autre
 * change de pièce, et à elles seules : à chaque fraction les deux côtés ont la même abscisse relative, donc l'embu (a plus
 * long que b) se répartit au prorata de la longueur, et chaque pièce reste une droite ou une courbe de Bézier unique. Le
 * parcours de b se donne déjà dans l'ordre de la couture : début de a contre début de b. Les deux côtés ont toujours
 * autant de pièces (`planOf`). Erreur typée (`SeamError`, `seam` pour l'identifiant) pour un côté sans longueur.
 */
export function pairWalks(a: readonly WalkEdge[], b: readonly WalkEdge[], seam: string): Pairing {
  const sides: readonly Side[] = [a, b].map((edges) => ({ edges, walk: walkOf(edges) }));
  if (sides.some((side) => !(side.walk.total > 0))) {
    throw new SeamError(seam, 'a side of the seam has no length');
  }
  const plan = planOf(sides.map((side) => side.walk));
  const sideA = cutSide(sides[0] as Side, plan, 0, seam);
  const sideB = cutSide(sides[1] as Side, plan, 1, seam);
  const pairs = sideA.walked.map((piece, index): readonly [Piece, Piece] => [
    piece,
    sideB.walked[index] as Piece,
  ]);
  return { a: sideA, b: sideB, pairs };
}

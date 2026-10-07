import { SeamError, SheetError } from './errors.js';
import { pairWalks } from './pairing.js';
import type { WalkEdge } from './pairing.js';
import { piecesLength } from './pieces.js';
import type { Piece } from './pieces.js';
import type { EdgeRun, PatternSeam, PatternSeamEnd } from './pattern-types.js';
import { roundMm } from './round.js';
import type { SeamEndSheet, SeamSheet } from './sheet.js';

/** Valeurs du magasin de FreeSewing que la fiche déclare, par clé (`DraftResult.values`). */
export type Values = Readonly<Record<string, number>>;

/**
 * Marge d'arrondi ajoutée à la tolérance de la fiche : les longueurs viennent de coordonnées arrondies à 0,001 mm, et
 * FreeSewing s'arrête à « au plus 2 mm » sans qu'un arrondi fasse échouer un tracé qui y est.
 */
export const ROUNDING_SLACK_MM = 0.01;

/** Un embu plus petit n'en est pas un : la couture n'en écrit pas, ses deux bords sont dits de même longueur. */
export const MIN_EASE_MM = 0.5;

/** Plus grand embu qu'une couture de GarmentSpec admet (`Seam.easeMm`). */
export const MAX_EASE_MM = 50;

/** Un bord d'une couture, dans le sens du parcours. */
export interface WalkRef {
  readonly run: EdgeRun;
  readonly reversed: boolean;
}

/** Couture appariée : ses deux parcours, ses paires de pièces et si elle déclare un embu. */
export interface SewnSeam {
  readonly sheet: SeamSheet;
  readonly a: readonly WalkRef[];
  /** Dans l'ordre de la couture (début de a contre début de b). */
  readonly b: readonly WalkRef[];
  readonly pairs: readonly (readonly [Piece, Piece])[];
  readonly eased: boolean;
}

function refOf(seam: SeamSheet, end: SeamEndSheet, index: ReadonlyMap<string, EdgeRun>): WalkRef {
  const run = index.get(`${end.part}#${end.edge}`);
  if (run === undefined) {
    throw new SheetError(`seam ${seam.id}`, `edge "${end.part}#${end.edge}" is not in the sheet`);
  }
  return { run, reversed: end.reversed === true };
}

/** Le parcours de b dans l'ordre de la couture : à `opposite`, il se lit de la fin au début. */
function sewingOrder(refs: readonly WalkRef[], align: SeamSheet['align']): WalkRef[] {
  if (align === 'same') return [...refs];
  return refs.map((ref) => ({ run: ref.run, reversed: !ref.reversed })).reverse();
}

const walkOf = (refs: readonly WalkRef[]): WalkEdge[] =>
  refs.map((ref) => ({ pieces: ref.run.pieces, reversed: ref.reversed }));

const lengthOf = (refs: readonly WalkRef[]): number =>
  refs.reduce((total, ref) => total + piecesLength(ref.run.pieces), 0);

/** Embu que la fiche déclare pour la couture : 0 sans règle, la valeur de `mm`, ou la longueur visée moins celle de b. */
function declaredEase(seam: SeamSheet, values: Values, lengthB: number): number {
  const rule = seam.ease;
  if (rule === undefined) return 0;
  if ('mm' in rule) return rule.mm;
  const target = values[rule.store];
  if (target === undefined) {
    throw new SheetError(
      `seam ${seam.id}`,
      `store value "${rule.store}" was not read from FreeSewing`,
    );
  }
  return target - lengthB;
}

/**
 * Coud une couture : contrôle que a et b diffèrent de l'embu déclaré à la tolérance de la fiche près (sinon `SeamError`,
 * sans valeur de mesure dans le message), puis les apparie en les coupant (`pairWalks`). Les bords de la couture gardent
 * les morceaux qui en résultent.
 */
export function sewSeam(
  seam: SeamSheet,
  index: ReadonlyMap<string, EdgeRun>,
  values: Values,
): SewnSeam {
  const a = seam.a.map((end) => refOf(seam, end, index));
  const b = sewingOrder(
    seam.b.map((end) => refOf(seam, end, index)),
    seam.align,
  );
  const lengthB = lengthOf(b);
  const ease = declaredEase(seam, values, lengthB);
  if (Math.abs(lengthOf(a) - lengthB - ease) > seam.toleranceMm + ROUNDING_SLACK_MM) {
    throw new SeamError(
      seam.id,
      `the length gap between the two sides differs from the declared ease by more than ${seam.toleranceMm} mm`,
    );
  }
  const pairing = pairWalks(walkOf(a), walkOf(b), seam.id);
  a.forEach((ref, i) => {
    ref.run.pieces = pairing.a.edges[i] as readonly Piece[];
  });
  b.forEach((ref, i) => {
    ref.run.pieces = pairing.b.edges[i] as readonly Piece[];
  });
  return { sheet: seam, a, b, pairs: pairing.pairs, eased: ease >= MIN_EASE_MM };
}

/** Un morceau retrouvé par sa pièce : la pièce de patron et l'identifiant du bord. */
export type EndOf = (piece: Piece) => PatternSeamEnd | undefined;

function endOf(seam: SeamSheet, ends: EndOf, piece: Piece): PatternSeamEnd {
  const end = ends(piece);
  if (end === undefined) {
    throw new SeamError(seam.id, 'an edge of the seam is cut again by another seam');
  }
  return end;
}

/**
 * Les coutures de la GarmentSpec issues d'une couture de la fiche, une par paire de morceaux (`<id>-<rang>` s'il y en a
 * plusieurs). Sur une couture qui déclare un embu, `easeMm` est l'écart mesuré entre les deux morceaux, tel que les
 * longueurs le donnent (jamais négatif : la fiche attend a plus long que b).
 */
export function patternSeamsOf(sewn: SewnSeam, ends: EndOf): PatternSeam[] {
  const seam = sewn.sheet;
  return sewn.pairs.map(([a, b], index) => {
    const easeMm = roundMm(a.lengthMm - b.lengthMm);
    if (sewn.eased && easeMm > MAX_EASE_MM) {
      throw new SeamError(
        seam.id,
        `the ease of a pair of pieces exceeds ${MAX_EASE_MM} mm, the contract maximum`,
      );
    }
    return {
      id: sewn.pairs.length > 1 ? `${seam.id}-${index + 1}` : seam.id,
      a: endOf(seam, ends, a),
      b: endOf(seam, ends, b),
      ...(sewn.eased && easeMm > 0 ? { easeMm } : {}),
    };
  });
}

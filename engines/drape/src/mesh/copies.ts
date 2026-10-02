import type { Panel, Point } from '@atelier/contracts-ts';
import { InvalidInputError } from '../core/validate.js';
import { onOriginalHalf, reflectVector, unfoldPanel, type FoldLine } from './unfold.js';

// Plan d'une pièce : dépliage éventuel, exemplaires et côté du porteur de chaque bord (ADR 0013). Pur, mm.

/** Côté du porteur (sa gauche, sa droite) ou `center` pour une pièce à cheval sur le milieu. */
export type Side = 'left' | 'right' | 'center';

export interface PanelPlan {
  /** Pièce du contrat. */
  panel: Panel;
  /** Pièce à mailler : la pièce dépliée si elle est coupée sur pliure, sinon la pièce du contrat. */
  contour: Panel;
  /** Par bord du contour : bord d'origine (index dans `panel.edges`) et moitié symétrique du pli. */
  edgeOrigin: readonly { edgeIndex: number; mirrored: boolean }[];
  fold?: FoldLine;
  /** 1 exemplaire, ou 2 pour `quantity: 2` (le second est la copie miroir). */
  copies: 1 | 2;
  /** Côté de la pièce telle que dessinée (la moitié d'origine pour une pièce dépliée). */
  drawnSide: Side;
}

export function oppositeSide(side: Side): Side {
  return side === 'left' ? 'right' : side === 'right' ? 'left' : 'center';
}

/**
 * Côté de la moitié dessinée d'une pièce sur pliure dont `bodySide` est `center` : vue de l'endroit, de face la
 * gauche du porteur est à droite de la page ; de dos (et pour `outer`) elle est à gauche.
 */
function foldDrawnSide(panel: Panel): Side {
  const fold = panel.edges.find((e) => e.role === 'fold') as Panel['edges'][number];
  const others = panel.edges.filter((e) => e.role !== 'fold');
  let cx = 0;
  for (const e of others) cx += e.from[0] + e.to[0];
  cx /= 2 * others.length;
  const viewerRight = cx >= (fold.from[0] + fold.to[0]) / 2;
  const facesFront = panel.placement === undefined || panel.placement.facing === 'front';
  if (facesFront) return viewerRight ? 'left' : 'right';
  return viewerRight ? 'right' : 'left';
}

/** Plan d'une pièce ; `InvalidInputError` si `quantity` n'est ni 1 ni 2, ou si une pièce sur pliure n'est pas seule. */
export function planPanel(panel: Panel): PanelPlan {
  const quantity = panel.quantity;
  if (quantity !== 1 && quantity !== 2) {
    throw new InvalidInputError('mesh', `panel ${panel.id}: quantity must be 1 or 2`);
  }
  const bodySide = panel.placement?.bodySide ?? 'center';
  if (panel.cutOnFold === true) {
    if (quantity !== 1) {
      throw new InvalidInputError(
        'mesh',
        `panel ${panel.id}: a cutOnFold panel must have quantity 1`,
      );
    }
    const unfolded = unfoldPanel(panel);
    const drawnSide = bodySide === 'center' ? foldDrawnSide(panel) : bodySide;
    return {
      panel,
      contour: unfolded.panel,
      edgeOrigin: unfolded.edgeOrigin,
      fold: unfolded.fold,
      copies: 1,
      drawnSide,
    };
  }
  const edgeOrigin = panel.edges.map((_, edgeIndex) => ({ edgeIndex, mirrored: false }));
  const drawnSide: Side = quantity === 2 && bodySide === 'center' ? 'right' : bodySide;
  return { panel, contour: panel, edgeOrigin, copies: quantity, drawnSide };
}

/** Côté du porteur de l'exemplaire `copy` du bord `contourEdge` du contour. */
export function edgeSide(plan: PanelPlan, copy: number, contourEdge: number): Side {
  const mirrored =
    plan.fold === undefined
      ? copy === 1
      : (plan.edgeOrigin[contourEdge] as { mirrored: boolean }).mirrored;
  return mirrored ? oppositeSide(plan.drawnSide) : plan.drawnSide;
}

/** Droit fil de la pièce : vecteur unitaire ; vertical (0, 1) s'il manque ou n'a pas de longueur. */
export function grainDirection(panel: Panel): [number, number] {
  const g = panel.grainline;
  if (g === undefined) return [0, 1];
  const [a, b] = g as [Point, Point];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  return len > 1e-9 ? [dx / len, dy / len] : [0, 1];
}

/**
 * Droit fil de chaque triangle (2 valeurs, unitaire) d'un maillage à plat de la pièce (avant symétrie de
 * l'exemplaire) : celui de la pièce ; pour une pièce dépliée, symétrisé sur la moitié symétrique (selon le
 * barycentre du triangle).
 */
export function triangleGrains(
  plan: PanelPlan,
  positionsMm: Float64Array,
  triangles: Uint32Array,
): Float64Array {
  const [gx, gy] = grainDirection(plan.panel);
  const [rx, ry] = plan.fold === undefined ? [gx, gy] : reflectVector(plan.fold, gx, gy);
  const out = new Float64Array((2 * triangles.length) / 3);
  for (let t = 0; t < triangles.length / 3; t++) {
    let useReflected = false;
    if (plan.fold !== undefined) {
      let x = 0;
      let y = 0;
      for (let k = 0; k < 3; k++) {
        const v = triangles[3 * t + k] as number;
        x += positionsMm[2 * v] as number;
        y += positionsMm[2 * v + 1] as number;
      }
      useReflected = !onOriginalHalf(plan.fold, x / 3, y / 3);
    }
    out[2 * t] = useReflected ? rx : gx;
    out[2 * t + 1] = useReflected ? ry : gy;
  }
  return out;
}

/** Symétrie gauche/droite (x → −x) de positions à plat (2 valeurs par sommet). */
export function mirrorPositions(positionsMm: Float64Array): Float64Array {
  const out = new Float64Array(positionsMm);
  for (let i = 0; i < out.length; i += 2) out[i] = -(out[i] as number);
  return out;
}

/** Triangles après symétrie : deux sommets échangés pour rester antihoraires. */
export function flipTriangles(triangles: Uint32Array): Uint32Array {
  const out = new Uint32Array(triangles);
  for (let i = 0; i < out.length; i += 3) {
    out[i + 1] = triangles[i + 2] as number;
    out[i + 2] = triangles[i + 1] as number;
  }
  return out;
}

/** Droit fil après symétrie gauche/droite : x change de signe. */
export function mirrorGrains(grains: Float64Array): Float64Array {
  const out = new Float64Array(grains);
  for (let i = 0; i < out.length; i += 2) out[i] = -(out[i] as number);
  return out;
}

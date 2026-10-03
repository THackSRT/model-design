/*
 * Lecture du patron (GarmentSpec, mm) : contours aplatis en polygones, largeur d'une pièce à une
 * hauteur du patron, tour fini d'un vêtement (somme des largeurs des pièces cousues ensemble).
 * Les pinces sont des échancrures du contour : leur ouverture est donc déjà retirée de la largeur.
 */
import type { GarmentSpec } from '@atelier/contracts-ts';

type Panel = GarmentSpec['panels'][number];
type Edge = Panel['edges'][number];
export type Point = [number, number];

/** Pièce aplatie : polygone, hauteurs extrêmes, multiplicité (pli, quantité) et côté éventuel. */
export interface FlatPanel {
  id: string;
  polygon: Point[];
  yMin: number;
  yMax: number;
  /** Nombre de pièces identiques : 2 pour une pièce coupée sur le pli, fois la quantité. */
  copies: number;
  side: 'left' | 'right' | 'none';
}

const CURVE_STEPS = 24;
/** Marge de lecture aux extrémités d'une pièce (évite de lire exactement sur un bord horizontal). */
const EDGE_MM = 0.05;

/** Point d'une courbe de Bézier (0 à 2 points de contrôle) au paramètre t. */
function bezier(pts: Point[], t: number): Point {
  let level = pts;
  while (level.length > 1) {
    level = level.slice(1).map((q, i): Point => {
      const p = level[i] as Point;
      return [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t];
    });
  }
  return level[0] as Point;
}

/** Points d'un bord, début compris, fin exclue. */
export function flattenEdge(edge: Edge): Point[] {
  const ctrl = (edge.controls ?? []) as Point[];
  if (ctrl.length === 0) return [edge.from as Point];
  const chain = [edge.from as Point, ...ctrl, edge.to as Point];
  return Array.from({ length: CURVE_STEPS }, (_, i) => bezier(chain, i / CURVE_STEPS));
}

export const polygonOf = (edges: readonly Edge[]): Point[] => edges.flatMap(flattenEdge);

/** Longueur d'un bord (courbe aplatie), mm. */
export function edgeLength(edge: Edge): number {
  const pts = [...flattenEdge(edge), edge.to as Point];
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(
      (pts[i] as Point)[0] - (pts[i - 1] as Point)[0],
      (pts[i] as Point)[1] - (pts[i - 1] as Point)[1],
    );
  }
  return len;
}

const sideOf = (id: string): FlatPanel['side'] => {
  if (/left/.test(id)) return 'left';
  return /right/.test(id) ? 'right' : 'none';
};

/** Pièces du corps du vêtement : manches et ceintures sont à part. */
const isBody = (p: Panel): boolean => !/^(sleeve|waistband)/.test(p.id);

const flatten = (p: Panel, copies: number): FlatPanel => {
  const polygon = polygonOf(p.edges);
  const ys = polygon.map((q) => q[1]);
  return {
    id: p.id,
    polygon,
    yMin: Math.min(...ys),
    yMax: Math.max(...ys),
    copies,
    side: sideOf(p.id),
  };
};

export function flatPanels(spec: GarmentSpec): FlatPanel[] {
  return spec.panels.filter(isBody).map((p) => flatten(p, (p.cutOnFold ? 2 : 1) * p.quantity));
}

/** Cotes d'une manche lues sur le patron (une pièce par bras, tour = largeur à plat). */
export interface SleeveProfile {
  /** Pièce de la manche, copies = 1 : `girthAt` donne le tour d'une manche. */
  panel: FlatPanel;
  /** Longueur de l'ourlet à la naissance de l'emmanchure (couture de dessous de bras), mm. */
  lengthMm: number;
}

export function sleeveProfile(spec: GarmentSpec): SleeveProfile | undefined {
  const raw = spec.panels.find((p) => /^sleeve/.test(p.id));
  if (!raw) return undefined;
  const panel = flatten(raw, 1);
  const under = raw.edges.filter((e) => /^underarm/.test(e.id));
  const top = under.length ? Math.max(...under.flatMap((e) => [e.from[1], e.to[1]])) : panel.yMax;
  return { panel, lengthMm: top - panel.yMin };
}

/** Longueur du contour à la hauteur y : somme des segments à l'intérieur (balayage pair-impair). */
export function widthAt(polygon: Point[], y: number): number {
  const xs: number[] = [];
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i] as Point;
    const b = polygon[(i + 1) % polygon.length] as Point;
    if (a[1] > y === b[1] > y) continue;
    xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
  }
  xs.sort((p, q) => p - q);
  let sum = 0;
  for (let i = 0; i + 1 < xs.length; i += 2) sum += (xs[i + 1] as number) - (xs[i] as number);
  return sum;
}

/**
 * Tour fini à la hauteur y du patron (mm) : somme des largeurs des pièces, chacune comptée autant de
 * fois qu'elle a de copies. `side` limite le tour à une jambe (pièces de ce côté).
 */
export function girthAt(panels: FlatPanel[], y: number, side?: 'left' | 'right'): number {
  let sum = 0;
  for (const p of panels) {
    if ((side && p.side !== side) || y < p.yMin - 1 || y > p.yMax + 1) continue;
    const yy = Math.min(Math.max(y, p.yMin + EDGE_MM), p.yMax - EDGE_MM);
    sum += widthAt(p.polygon, yy) * p.copies;
  }
  return sum;
}

/** Cotes d'une jupe cercle lues sur les arcs du patron : tours (mm) à la taille et à l'ourlet, longueur. */
export interface CircleProfile {
  lengthMm: number;
  waistGirthMm: number;
  hemGirthMm: number;
}

/**
 * Une jupe cercle se lit en arcs, pas en largeurs : le tour à une distance d de la taille va
 * linéairement du tour de taille (arcs `waist-*`) au tour d'ourlet (arcs d'ourlet).
 */
export function circleProfile(spec: GarmentSpec): CircleProfile | undefined {
  let waist = 0;
  let hem = 0;
  let length = 0;
  for (const panel of spec.panels.filter(isBody)) {
    const copies = (panel.cutOnFold ? 2 : 1) * panel.quantity;
    for (const e of panel.edges) {
      if (e.role === 'hem') hem += edgeLength(e) * copies;
      else if (/^waist/.test(e.id)) waist += edgeLength(e) * copies;
      else if (e.id === 'side-right') length = Math.max(length, edgeLength(e));
    }
  }
  return waist > 0 && hem > waist && length > 0
    ? { lengthMm: length, waistGirthMm: waist, hemGirthMm: hem }
    : undefined;
}

/** Hauteur du patron où les jambes se séparent : début des bords d'entrejambe (`inseam-upper`). */
export function crotchLevel(spec: GarmentSpec): number | undefined {
  const ys = spec.panels
    .filter(isBody)
    .flatMap((p) => p.edges.filter((e) => e.id === 'inseam-upper').map((e) => e.from[1]));
  return ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : undefined;
}

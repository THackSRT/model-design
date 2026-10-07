import { draftPart } from '../src/core/part.js';
import type { ModelSheet, NotchSheet, PartSheet, PlacementSheet } from '../src/core/sheet.js';
import type { DraftedPart, PathOp, PointMm, TracedPart } from '../src/core/types.js';

/**
 * Un vêtement de démonstration, tracé à la main (sans FreeSewing) : un devant et un dos coupés au pli, une manche en
 * paire dont la tête est faite de deux courbes, comme Brian mais d'autres mesures. Il sert à montrer que la conversion en
 * patron ne lit que la fiche : rien n'y est propre à Brian. Repère du tracé : y vers le bas, origine au haut de l'axe.
 */
export const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });
const move = (x: number, y: number): PathOp => ({ type: 'move', to: p(x, y) });
const line = (x: number, y: number): PathOp => ({ type: 'line', to: p(x, y) });
const curve = (c1: PointMm, c2: PointMm, to: PointMm): PathOp => ({
  type: 'curve',
  cp1: c1,
  cp2: c2,
  to,
});

/** Emmanchure du devant et du dos : de (100, 100) à (60, 0), une seule courbe. */
const ARM = { c1: p(100, 60), c2: p(90, 30), to: p(60, 0) };

function body(name: string): TracedPart {
  return {
    name,
    hidden: false,
    points: { o: p(0, 0), b: p(0, 200), c: p(100, 200), d: p(100, 100), e: p(60, 0) },
    seam: [
      move(0, 0),
      line(0, 200),
      line(100, 200),
      line(100, 100),
      curve(ARM.c1, ARM.c2, ARM.to),
      line(0, 0),
      { type: 'close' },
    ],
  };
}

/** Manche : dessous de bras à gauche et à droite, bas, tête en deux courbes inégales (0,46 et 0,54 de sa longueur), un peu plus longue que les deux emmanchures. */
export const SLEEVE: TracedPart = {
  name: 'demo.sleeve',
  hidden: false,
  points: { l: p(-50, 0), bl: p(-40, 200), br: p(40, 200), r: p(50, 0), t: p(10, -88) },
  seam: [
    move(-50, 0),
    line(-40, 200),
    line(40, 200),
    line(50, 0),
    curve(p(50, -45), p(35, -83), p(10, -88)),
    curve(p(-20, -94), p(-50, -66), p(-50, 0)),
    { type: 'close' },
  ],
};

/** Devant et dos : ancrés au coin d'ourlet sur l'axe (`b`), le point `d` (côté, à mi-hauteur) à la hauteur du repère. */
export const placement = (facing: PlacementSheet['facing']): PlacementSheet => ({
  zone: 'torso',
  bodySide: 'center',
  facing,
  landmark: 'waist',
  anchorPoint: 'b',
  levelPoint: 'd',
  offsetMm: 0,
  clearanceMm: 30,
});

function bodySheet(part: string, id: string, notches: NotchSheet[] = []): PartSheet {
  return {
    part,
    id,
    frame: { axis: 'o', top: 'o' },
    panel: {
      name: id,
      quantity: 1,
      cutOnFold: true,
      placement: placement(id === 'front' ? 'front' : 'back'),
      grain: { xFraction: 0.5, lowFraction: 0.2, highFraction: 0.8 },
      notches,
    },
    edges: [
      { id: 'fold', semanticRole: 'centerFront', role: 'fold', from: 'o', to: 'b' },
      { id: 'hem', semanticRole: 'hem', from: 'b', to: 'c' },
      { id: 'side', semanticRole: 'side', from: 'c', to: 'd' },
      { id: 'arm', semanticRole: 'armhole', from: 'd', to: 'e' },
      { id: 'top', semanticRole: 'neckline', from: 'e', to: 'o' },
    ],
  };
}

const SLEEVE_SHEET: PartSheet = {
  part: 'demo.sleeve',
  id: 'sleeve',
  frame: { axis: 't', top: 't' },
  panel: {
    name: 'sleeve',
    quantity: 2,
    cutOnFold: false,
    placement: {
      zone: 'arm',
      bodySide: 'right',
      facing: 'outer',
      landmark: 'shoulder',
      offsetMm: 0,
      clearanceMm: 30,
    },
  },
  edges: [
    { id: 'underL', semanticRole: 'underarm', from: 'l', to: 'bl' },
    { id: 'cuff', semanticRole: 'sleeveHem', from: 'bl', to: 'br' },
    { id: 'underR', semanticRole: 'underarm', from: 'br', to: 'r' },
    { id: 'cap', semanticRole: 'sleeveCap', from: 'r', to: 'l', via: ['t'] },
  ],
};

/** Fiche du vêtement : côté devant/dos exact, tête de manche contre les deux emmanchures avec un embu `easeMm`. */
export function demoSheet(easeMm: number, toleranceMm = 0.5): ModelSheet {
  return {
    garmentType: 'demo',
    parts: [
      bodySheet('demo.front', 'front', [
        { edge: 'arm', at: 'd' },
        { edge: 'arm', at: 'e', count: 2 },
      ]),
      bodySheet('demo.back', 'back'),
      SLEEVE_SHEET,
    ],
    seams: [
      {
        id: 'side',
        a: [{ part: 'front', edge: 'side' }],
        b: [{ part: 'back', edge: 'side' }],
        align: 'same',
        toleranceMm,
      },
      {
        id: 'arm',
        a: [{ part: 'sleeve', edge: 'cap' }],
        b: [
          { part: 'front', edge: 'arm' },
          { part: 'back', edge: 'arm', reversed: true },
        ],
        align: 'same',
        ease: { mm: easeMm },
        toleranceMm,
      },
      {
        id: 'under',
        a: [{ part: 'sleeve', edge: 'underR' }],
        b: [{ part: 'sleeve', edge: 'underL' }],
        align: 'opposite',
        toleranceMm,
      },
    ],
  };
}

/** Pièces tracées du vêtement, passées par `draftPart` comme le moteur le fait pour FreeSewing. */
export function demoParts(sheet: ModelSheet): DraftedPart[] {
  const traced = [body('demo.front'), body('demo.back'), SLEEVE];
  return sheet.parts.map((part, i) => draftPart(part, traced[i]));
}

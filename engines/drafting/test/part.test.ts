import { describe, expect, it } from 'vitest';
import { ContourError } from '../src/core/errors.js';
import { draftPart } from '../src/core/part.js';
import { roundMm } from '../src/core/round.js';
import type { PartSheet } from '../src/core/sheet.js';
import type { PathOp, PointMm, TracedPart } from '../src/core/types.js';
import { numbersIn } from './helpers.js';

const p = (xMm: number, yMm: number): PointMm => ({ xMm, yMm });

const SIDE = 100.00049; // millimètres ; le premier segment mesure 100.00089, que l'arrondi à 0,001 donne 100.001
const SEAM: PathOp[] = [
  { type: 'move', to: p(-0.0004, 0.0003) },
  { type: 'line', to: p(SIDE, 0) },
  { type: 'curve', cp1: p(SIDE + 20.12345, 30), cp2: p(SIDE + 20.12345, 70), to: p(SIDE, SIDE) },
  { type: 'line', to: p(0, SIDE) },
  { type: 'close' },
];

const TRACED: TracedPart = {
  name: 'demo.piece',
  hidden: false,
  points: {
    corner: p(0, 0),
    alias: p(0.004, -0.004), // à moins de 0,01 mm du premier sommet
    right: p(SIDE, 0),
    bottomRight: p(SIDE, SIDE),
    bottomLeft: p(0, SIDE),
    _temporary: p(0, 0),
    __macro_title_nr: p(3, 3),
    inside: p(50, 50),
  },
  seam: SEAM,
};

const SHEET: PartSheet = {
  part: 'demo.piece',
  id: 'piece',
  edges: [
    { id: 'top', semanticRole: 'shoulder', from: 'corner', to: 'right' },
    { id: 'round', semanticRole: 'side', from: 'right', to: 'bottomRight' },
    { id: 'bottom', semanticRole: 'hem', from: 'bottomRight', to: 'bottomLeft' },
    { id: 'left', semanticRole: 'centerFront', from: 'bottomLeft', to: 'corner' },
  ],
};

describe('draftPart', () => {
  it('découpe la pièce en bords nommés et rend le contour', () => {
    const part = draftPart(SHEET, TRACED);
    expect(part).toMatchObject({ part: 'demo.piece', id: 'piece' });
    expect(part.edges.map((e) => [e.id, e.semanticRole])).toEqual([
      ['top', 'shoulder'],
      ['round', 'side'],
      ['bottom', 'hem'],
      ['left', 'centerFront'],
    ]);
    expect(part.contour.vertices).toHaveLength(4);
    expect(part.contour.segments.map((s) => s.kind)).toEqual(['line', 'curve', 'line', 'line']);
  });

  it('nomme chaque sommet avec tous les points publics qui s’y trouvent', () => {
    const { contour } = draftPart(SHEET, TRACED);
    expect(contour.vertices.map((v) => v.names)).toEqual([
      ['corner', 'alias'],
      ['right'],
      ['bottomRight'],
      ['bottomLeft'],
    ]);
  });

  it('ne sort pas les points temporaires (préfixe _) ni ceux des macros', () => {
    const { points } = draftPart(SHEET, TRACED);
    expect(Object.keys(points)).toEqual([
      'corner',
      'alias',
      'right',
      'bottomRight',
      'bottomLeft',
      'inside',
    ]);
  });

  it('arrondit tout à 0,001 mm, sans −0', () => {
    const part = draftPart(SHEET, TRACED);
    const numbers = numbersIn(part);
    expect(numbers.length).toBeGreaterThan(30);
    for (const value of numbers) {
      expect(Object.is(value, -0)).toBe(false);
      expect(Math.abs(value * 1000 - Math.round(value * 1000))).toBeLessThan(1e-6);
    }
    expect(part.contour.vertices[0]).toMatchObject({ xMm: 0, yMm: 0 });
    expect(part.edges[0]?.lengthMm).toBe(100.001);
    expect(part.contour.segments[0]?.lengthMm).toBe(100.001);
  });

  it('arrondit la longueur d’un bord depuis la somme brute de ses segments', () => {
    const part = draftPart(SHEET, TRACED);
    const raw = part.contour.segments.map((s) => s.lengthMm);
    // Les longueurs de segments sont déjà arrondies : la somme brute du bord en est à 0,0005 mm par segment au plus.
    const round = part.edges.find((e) => e.id === 'round');
    expect(Math.abs((round?.lengthMm ?? 0) - (raw[1] ?? 0))).toBeLessThan(0.0006);
    expect(roundMm(round?.lengthMm ?? 0)).toBe(round?.lengthMm);
  });

  it.each([
    ['absente', undefined],
    ['masquée', { ...TRACED, hidden: true }],
  ])('refuse une pièce %s', (_name, traced) => {
    const attempt = (): unknown => draftPart(SHEET, traced);
    expect(attempt).toThrow(ContourError);
    expect(attempt).toThrow('part demo.piece: the part was not drafted');
  });

  it('refuse un point public aux coordonnées non finies, mais pas un point temporaire', () => {
    const broken = { ...TRACED, points: { ...TRACED.points, inside: p(Number.NaN, 50) } };
    expect(() => draftPart(SHEET, broken)).toThrow(ContourError);
    expect(() => draftPart(SHEET, broken)).toThrow('point "inside" has a non-finite coordinate');
    const temporary = { ...TRACED, points: { ...TRACED.points, _tmp: p(Number.NaN, 0) } };
    expect(() => draftPart(SHEET, temporary)).not.toThrow();
  });

  it('refuse une pièce sans chemin de couture', () => {
    expect(() => draftPart(SHEET, { ...TRACED, seam: undefined })).toThrow('no seam path');
  });
});

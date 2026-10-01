import { describe, expect, it } from 'vitest';
import { layoutCutPieces } from '../src/cut-pieces/layout.js';
import { cutPattern } from './cut-fixtures.js';

describe('mise en page des pièces de coupe', () => {
  const layout = layoutCutPieces(cutPattern);
  const [front, back] = layout.pieces;

  it('une forme par pièce, avec les données d’étiquette', () => {
    expect(layout.pieces).toHaveLength(2);
    expect(front?.label).toEqual({ name: 'Devant', quantity: 1, cutOnFold: true });
    expect(back?.label).toEqual({ name: 'Dos', quantity: 2, cutOnFold: false });
  });

  it('ligne de coupe fermée, y retourné (le haut du contrat devient y = 0)', () => {
    expect(front?.cutPath).toBe('M 0.0 640.0 L 260.0 640.0 L 190.0 0.0 L 0.0 0.0 Z');
  });

  it('pliure seulement si la pièce se coupe sur la pliure', () => {
    expect(front?.foldPath).toBe('M 0.0 10.0 L 0.0 610.0');
    expect(back?.foldPath).toBeUndefined();
  });

  it('un segment par entaille de cran', () => {
    expect(front?.notchesPath.match(/M/g)).toHaveLength(2);
    expect(back?.notchesPath).toBe('');
  });

  it('couture bord par bord et droit fil avec deux pointes', () => {
    expect(front?.seamPath.match(/M/g)).toHaveLength(3);
    expect(front?.grainPath.match(/M/g)).toHaveLength(3);
  });

  it('pièces côte à côte avec 40 mm d’écart ; viewBox englobant toutes les pièces', () => {
    expect(back?.cutPath.startsWith('M 300.0 400.0')).toBe(true);
    expect(layout.viewBox).toBe('-10 -10 520 660');
  });
});

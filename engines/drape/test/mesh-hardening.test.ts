import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Panel } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  DrapeTooLargeError,
  MAX_COORDINATE_MM,
  MAX_SEAMS_PER_GARMENT,
  meshGarment,
  meshPanel,
} from '../src/index.js';
import { InvalidInputError } from '../src/core/validate.js';
import { costRatio } from './helpers.js';
import { specOf } from './mesh-garment-helpers.js';
import { polygonPanel, rectPanel } from './mesh-helpers.js';

// Entrées venues du réseau : aucune ne doit faire tourner sans fin ni allouer sans borne.

const square = (side: number, id = 'p'): Panel =>
  polygonPanel(
    [
      [0, 0],
      [side, 0],
      [side, side],
      [0, side],
    ],
    id,
  );

describe('coordonnées', () => {
  it('une pièce à x = 1e18 est refusée tout de suite', () => {
    const far = polygonPanel([
      [1e18, 0],
      [1e18 + 1e17, 0],
      [1e18 + 1e17, 100],
      [1e18, 100],
    ]);
    const ratio = costRatio(() => {
      expect(() => meshPanel(far, 'draft')).toThrow(InvalidInputError);
      expect(() => meshGarment(specOf([far]), 'draft')).toThrow(InvalidInputError);
    });
    expect(ratio).toBeLessThan(0.1);
  });

  it.each([NaN, Infinity, -Infinity])('la coordonnée %s est refusée', (bad) => {
    const p = rectPanel(100, 100);
    p.edges[1].to = [100, bad];
    p.edges[2].from = [100, bad];
    expect(() => meshPanel(p, 'draft')).toThrow(InvalidInputError);
    expect(() => meshGarment(specOf([p]), 'draft')).toThrow(InvalidInputError);
    const g = {
      ...rectPanel(100, 100),
      grainline: [
        [0, 0],
        [bad, 1],
      ] as Panel['grainline'],
    };
    expect(() => meshGarment(specOf([g]), 'draft')).toThrow(InvalidInputError);
  });

  it('un bord de 1e9 mm dépasse la borne des coordonnées', () => {
    expect(MAX_COORDINATE_MM).toBe(10_000);
    expect(() => meshPanel(rectPanel(1e9, 100), 'draft')).toThrow(InvalidInputError);
  });
});

describe('taille : refus avant le travail coûteux', () => {
  it.each([10_000, 9_900])(
    'un carré de %s mm → DrapeTooLargeError en moins de 100 ms CPU',
    (side) => {
      meshPanel(square(100), 'draft'); // chauffe
      const ratio = costRatio(() => {
        expect(() => meshPanel(square(side), 'draft')).toThrow(DrapeTooLargeError);
        expect(() => meshPanel(square(side), 'standard')).toThrow(DrapeTooLargeError);
      });
      expect(ratio).toBeLessThan(0.1);
    },
  );

  it('une pièce fine en diagonale (boîte englobante énorme) est refusée vite', () => {
    const strip = polygonPanel([
      [0, 0],
      [9000, 9000],
      [9000, 9001],
      [0, 1],
    ]);
    const ratio = costRatio(() => {
      expect(() => meshPanel(strip, 'standard')).toThrow(DrapeTooLargeError);
    });
    expect(ratio).toBeLessThan(0.1);
  });

  it('une maille impose son budget de sommets à la pièce', () => {
    expect(() => meshPanel(square(500), 'draft', { maxVertices: 100 })).toThrow(DrapeTooLargeError);
    expect(() => meshPanel(square(500), 'draft', { maxVertices: 5000 })).not.toThrow();
  });

  it('un vêtement dont la somme dépasse la limite s’arrête avec le reste du budget, sans mailler plus', () => {
    const first = square(1000, 'a');
    const huge = square(9900, 'b');
    let message = '';
    const ratio = costRatio(() => {
      try {
        meshGarment(specOf([first, huge]), 'draft');
      } catch (e) {
        expect(e).toBeInstanceOf(DrapeTooLargeError);
        message = (e as Error).message;
      }
    });
    // le budget restant est celui de 30 000 sommets moins ceux de la première pièce
    expect(message).toMatch(/budget of 2[0-9]{4}$/);
    expect(ratio).toBeLessThan(0.2);
  });

  it('trop de coutures → DrapeTooLargeError', () => {
    const seams = Array.from({ length: MAX_SEAMS_PER_GARMENT + 1 }, (_, i) => ({
      id: `s${i}`,
      a: { panelId: 'p', edgeId: 'e0' },
      b: { panelId: 'p', edgeId: 'e2' },
    }));
    expect(() => meshGarment(specOf([square(100)], seams), 'draft')).toThrow(DrapeTooLargeError);
  });
});

describe('déterminisme du code et des fixtures', () => {
  it('aucun Math.hypot dans src/mesh', () => {
    const dir = fileURLToPath(new URL('../src/mesh/', import.meta.url));
    for (const f of readdirSync(dir)) {
      expect(readFileSync(dir + f, 'utf8'), f).not.toContain('Math.hypot');
    }
  });

  it('chaque fixture est identique octet pour octet à sa référence golden du patronage', () => {
    const fixtures = fileURLToPath(new URL('./fixtures/', import.meta.url));
    const golden = fileURLToPath(new URL('../../patterning/tests/golden/', import.meta.url));
    const names = readdirSync(fixtures).filter((f) => f.endsWith('.json'));
    expect(names.length).toBeGreaterThanOrEqual(5);
    for (const name of names) {
      const ref = readFileSync(golden + name.replace('.json', '-reference.json'));
      expect(readFileSync(fixtures + name).equals(ref), name).toBe(true);
    }
  });
});

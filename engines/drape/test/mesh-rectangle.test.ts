import { describe, expect, it } from 'vitest';
import { MAX_EDGE_RATIO, MESH_EDGE_MM, meshPanel, type MeshQuality } from '../src/index.js';
import { meshStats, rectPanel } from './mesh-helpers.js';

describe.each(['draft', 'standard'] as MeshQuality[])(
  'rectangle 400 x 600, qualité %s',
  (quality) => {
    const h = MESH_EDGE_MM[quality];
    const mesh = meshPanel(rectPanel(400, 600), quality);
    const s = meshStats(mesh);

    it("conserve l'aire à 0,1 % près", () => {
      expect(Math.abs(s.area - 240000) / 240000).toBeLessThan(1e-3);
    });
    it('a des arêtes de 1,2 h au plus', () => {
      expect(s.maxEdge).toBeLessThanOrEqual(MAX_EDGE_RATIO * h);
    });
    it('n a ni triangle dégénéré ni triangle inversé', () => {
      expect(s.minTriangleArea).toBeGreaterThan(0.05 * h * h);
    });
    it("n'a pas d'angle inférieur à 20 degrés", () => {
      expect(s.minAngleDeg).toBeGreaterThanOrEqual(20);
    });
    it('utilise tous les sommets', () => {
      expect(s.usedVertices).toBe(mesh.positionsMm.length / 2);
    });
  },
);

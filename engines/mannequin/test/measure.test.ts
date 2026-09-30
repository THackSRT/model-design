import { describe, expect, it } from 'vitest';
import { circumference, crotchHeight, measure, ringPoints } from '../src/core/measure.js';
import type { MhModel } from '../src/core/types.js';

const SEGMENTS = 16;
const RADIUS = 10;
const POLYGON = SEGMENTS * 2 * RADIUS * Math.sin(Math.PI / SEGMENTS);

/** Cylindre vertical (rayon 10, hauteur 0..20) ; chaque zone en couvre tous les sommets. */
function cylinder(offsetX = 0): { model: MhModel; pos: Float32Array } {
  const pos: number[] = [];
  for (const y of [0, 20]) {
    for (let i = 0; i < SEGMENTS; i++) {
      const a = (2 * Math.PI * i) / SEGMENTS;
      pos.push(offsetX + RADIUS * Math.cos(a), y, RADIUS * Math.sin(a));
    }
  }
  const tris: number[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const j = (i + 1) % SEGMENTS;
    tris.push(i, j, SEGMENTS + i, j, SEGMENTS + j, SEGMENTS + i);
  }
  const all = Array.from({ length: pos.length / 3 }, (_, i) => i);
  const region = { verts: all, band: all, inRegion: new Uint8Array(all.map(() => 1)) };
  const model = {
    regions: { waist: region, hip: region, thigh: region },
    trisBase: Uint16Array.from(tris),
  } as unknown as MhModel;
  return { model, pos: Float32Array.from(pos) };
}

describe('circumference', () => {
  it('rend le périmètre du polygone coupé par le plan de la zone', () => {
    const { model, pos } = cylinder();
    const ring = circumference(model, pos, 'waist', 1);
    expect(ring.value).toBeCloseTo(POLYGON, 4);
    expect(ring.center[1]).toBeCloseTo(10, 6);
    expect(ring.normal).toEqual([0, 1, 0]);
    expect(ring.side).toBe(false);
  });

  it("applique l'échelle au résultat", () => {
    const { model, pos } = cylinder();
    const one = circumference(model, pos, 'waist', 1).value;
    expect(circumference(model, pos, 'waist', 2.5).value).toBeCloseTo(one * 2.5, 9);
  });

  it('mesure seulement le côté gauche (x > 0) pour une zone double', () => {
    const { model, pos } = cylinder(30);
    const ring = circumference(model, pos, 'thigh', 1);
    expect(ring.side).toBe(true);
    expect(ring.value).toBeCloseTo(POLYGON, 4);
  });

  it('rend NaN (pas 0) et une enveloppe vide sur une coupe vide', () => {
    const { model, pos } = cylinder();
    // Aucun triangle : le plan de coupe ne rencontre rien.
    const empty = { ...model, trisBase: new Uint16Array(0) } as unknown as MhModel;
    const none = circumference(empty, pos, 'waist', 1);
    expect(none.value).toBeNaN();
    expect(none.hull).toEqual([]);
  });

  it('refuse une zone inconnue', () => {
    const { model, pos } = cylinder();
    expect(() => circumference(model, pos, 'nuque', 1)).toThrow();
  });
});

describe('ringPoints', () => {
  it("replace l'enveloppe dans l'espace autour du centre de l'anneau", () => {
    const { model, pos } = cylinder();
    const ring = circumference(model, pos, 'waist', 1);
    const pts = ringPoints(ring);
    expect(pts).toHaveLength(ring.hull.length);
    for (const p of pts) {
      expect(p[1]).toBeCloseTo(10, 6);
      const r = Math.hypot(p[0], p[2]);
      expect(r).toBeLessThanOrEqual(RADIUS + 1e-6);
      expect(r).toBeGreaterThanOrEqual(RADIUS * Math.cos(Math.PI / SEGMENTS) - 1e-6);
    }
  });
});

describe('crotchHeight et measure', () => {
  it("mesure l'entrejambe au-dessus du point le plus bas", () => {
    const { model, pos } = cylinder();
    // bassin moyen à y = 10 ; le sommet (0, 7, 0) est entre les jambes, au-dessus de la mi-hauteur
    const extra = Float32Array.from([...pos, 0, 7, 0]);
    expect(crotchHeight(model, extra, 0)).toBe(7);
  });

  it('met à l’échelle de la stature demandée', () => {
    const { model, pos } = cylinder();
    const m = measure(model, pos, 40);
    expect(m['scale']).toBeCloseTo(2, 12);
    expect(m['stature']).toBeCloseTo(40, 12);
    expect(m['waist']).toBeCloseTo(2 * POLYGON, 4);
    expect(Object.keys(m.rings).sort()).toEqual(['hip', 'thigh', 'waist']);
    expect(measure(model, pos, null)['scale']).toBe(1);
  });
});

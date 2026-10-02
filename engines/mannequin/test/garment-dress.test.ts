import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  dressMannequin,
  loadMannequinEngine,
  type FittedMannequin,
  type GarmentMesh,
  type MannequinEngine,
} from '../src/index.js';
import { perimeter } from '../src/garment/ring.js';
import { createSectioner } from '../src/garment/section.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
/** Patrons de référence du moteur de patronage (copies en lecture seule : mesures fictives de ses tests). */
const pattern = (name: string): GarmentSpec =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));

/** Mêmes mesures que celles des patrons de référence. */
const REFERENCE: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 640,
  hipGirthMm: 960,
  crotchHeightMm: 770,
};
/** Tolérance « à l'intérieur du corps » : 1 mm, en cm. */
const INSIDE_TOLERANCE_CM = 0.1;

/** Distance (cm) d'un point à l'intérieur d'un polygone convexe direct ; négative dehors. */
function depthInside(hull: [number, number][], p: [number, number]): number {
  let depth = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i] as [number, number];
    const b = hull[(i + 1) % hull.length] as [number, number];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const side = ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / len;
    depth = Math.min(depth, side);
  }
  return depth;
}

/** Plus grande profondeur d'un sommet du vêtement dans le corps (cm) ; <= 0 : tout est dehors. */
function deepestVertex(fitted: FittedMannequin, mesh: GarmentMesh): number {
  const sect = createSectioner(fitted.body.positions, fitted.body.index);
  let deepest = -Infinity;
  const cache = new Map<number, ReturnType<typeof sect.at>>();
  for (let v = 0; v < mesh.positions.length; v += 3) {
    const y = mesh.positions[v + 1] as number;
    const parts = cache.get(y) ?? sect.at(y);
    cache.set(y, parts);
    const big = parts.filter((p) => p.area >= 0.3 * (parts[0]?.area ?? 0));
    for (const part of big) {
      const p: [number, number] = [mesh.positions[v] as number, mesh.positions[v + 2] as number];
      deepest = Math.max(deepest, depthInside(part.hull, p));
    }
  }
  return deepest;
}

/** Points (x, z) des sommets à la hauteur y (cm). */
const ringAt = (mesh: GarmentMesh, y: number): [number, number][] => {
  const out: [number, number][] = [];
  for (let v = 0; v < mesh.positions.length; v += 3) {
    if (Math.abs((mesh.positions[v + 1] as number) - y) < 1e-4) {
      out.push([mesh.positions[v] as number, mesh.positions[v + 2] as number]);
    }
  }
  return out;
};

const heights = (mesh: GarmentMesh): { min: number; max: number } => {
  const ys = Array.from(
    { length: mesh.positions.length / 3 },
    (_, i) => mesh.positions[3 * i + 1] as number,
  );
  return { min: Math.min(...ys), max: Math.max(...ys) };
};

describe('habillage rapide du mannequin', () => {
  let engine: MannequinEngine;
  let body: FittedMannequin;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
    body = engine.fit(REFERENCE);
  });

  describe('jupe droite', () => {
    it('reste entièrement à l’extérieur du corps, sans zone trop juste avec l’aisance par défaut', () => {
      const mesh = dressMannequin(body, pattern('straight-skirt'), { type: 'straight-skirt' });
      expect(deepestVertex(body, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
      expect(mesh.tightZones).toEqual([]);
    });

    it('a, à la taille, le tour fini du patron à 1 % près', () => {
      const spec = pattern('straight-skirt');
      // Tour fini attendu, lu sur les bords de taille (horizontaux) : indépendant du balayage.
      let finished = 0;
      for (const panel of spec.panels) {
        const copies = (panel.cutOnFold ? 2 : 1) * panel.quantity;
        for (const e of panel.edges.filter((x) => x.role === 'waistline')) {
          finished += Math.abs(e.to[0] - e.from[0]) * copies;
        }
      }
      const mesh = dressMannequin(body, spec, { type: 'straight-skirt' });
      const waist = ringAt(mesh, body.landmarksMm.waist / 10);
      expect(waist.length).toBeGreaterThan(0);
      expect(Math.abs((perimeter(waist) * 10) / finished - 1)).toBeLessThan(0.01);
    });

    it('descend de la taille à l’ourlet du patron', () => {
      const mesh = dressMannequin(body, pattern('straight-skirt'), { type: 'straight-skirt' });
      const { min, max } = heights(mesh);
      expect(max * 10).toBeCloseTo(body.landmarksMm.waist, 3);
      expect(min * 10).toBeCloseTo(body.landmarksMm.waist - 600, 3);
    });

    it('signale une zone trop juste à la taille quand le patron est plus petit que le corps', () => {
      const large = engine.fit({ ...REFERENCE, waistGirthMm: 740 });
      const mesh = dressMannequin(large, pattern('straight-skirt'), { type: 'straight-skirt' });
      const waist = large.landmarksMm.waist;
      const zone = mesh.tightZones.find((z) => z.fromMm <= waist && waist <= z.toMm);
      expect(zone).toBeDefined();
      // Tour du patron à la taille : 640 + 10 d'aisance ; le corps mesure 740.
      const expected = (large.measuredMm.waist ?? 0) - 650;
      expect(zone?.shortfallMm).toBeGreaterThan(expected - 10);
      expect(zone?.shortfallMm).toBeLessThan(expected + 60);
      expect(deepestVertex(large, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
    });
  });

  describe('autres vêtements', () => {
    it('a un ourlet de jupe cercle bien plus large que les hanches', () => {
      const mesh = dressMannequin(body, pattern('circle-skirt'), { type: 'circle-skirt' });
      const hem = perimeter(ringAt(mesh, heights(mesh).min)) * 10;
      expect(hem).toBeGreaterThan(2 * (body.measuredMm.hip ?? 0));
      expect(deepestVertex(body, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
      expect(mesh.tightZones).toEqual([]);
    });

    it("sépare les deux jambes du pantalon sous l'entrejambe", () => {
      const mesh = dressMannequin(body, pattern('trousers'), { type: 'trousers' });
      const crotchCm = body.landmarksMm.crotch / 10;
      const legs: [number, number][] = [];
      for (let v = 0; v < mesh.positions.length; v += 3) {
        if ((mesh.positions[v + 1] as number) < crotchCm - 5) {
          legs.push([mesh.positions[v] as number, mesh.positions[v + 2] as number]);
        }
      }
      expect(legs.some((p) => p[0] > 0)).toBe(true);
      expect(legs.some((p) => p[0] < 0)).toBe(true);
      expect(Math.min(...legs.map((p) => Math.abs(p[0])))).toBeGreaterThan(0.1);
      expect(deepestVertex(body, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
      expect(mesh.tightZones).toEqual([]);
    });

    it('couvre le corsage de sous la taille au cou', () => {
      const mesh = dressMannequin(body, pattern('bodice'), { type: 'bodice' });
      const { min, max } = heights(mesh);
      expect(min * 10).toBeCloseTo(body.landmarksMm.waist - 60, 3);
      expect(max * 10).toBeCloseTo(body.landmarksMm.neck, 3);
      expect(deepestVertex(body, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
    });

    it('refuse un type de vêtement inconnu', () => {
      expect(() => dressMannequin(body, pattern('bodice'), { type: 'cape' })).toThrow(/cape/);
    });
  });

  describe('résolution, déterminisme et propriété des tableaux', () => {
    it('suit le nombre d’anneaux et de sommets demandés', () => {
      const mesh = dressMannequin(
        body,
        pattern('straight-skirt'),
        { type: 'straight-skirt' },
        { rings: 10, segments: 24 },
      );
      expect(mesh.positions).toHaveLength(10 * 24 * 3);
      expect(mesh.normals).toHaveLength(mesh.positions.length);
      expect(mesh.index).toHaveLength(9 * 24 * 6);
    });

    it('rend des triangles valides, des normales unitaires et des valeurs finies', () => {
      const mesh = dressMannequin(body, pattern('trousers'), { type: 'trousers' });
      const vertices = mesh.positions.length / 3;
      expect(mesh.index.every((i) => i < vertices)).toBe(true);
      expect(mesh.positions.every(Number.isFinite)).toBe(true);
      for (let v = 0; v < vertices; v++) {
        const n = Math.hypot(...[0, 1, 2].map((q) => mesh.normals[3 * v + q] as number));
        expect(Math.abs(n - 1)).toBeLessThan(1e-3);
      }
    });

    it('rend les mêmes tableaux pour la même entrée, neufs à chaque appel', () => {
      const run = (): GarmentMesh => dressMannequin(body, pattern('bodice'), { type: 'bodice' });
      const a = run();
      const b = run();
      expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
      expect(Array.from(a.normals)).toEqual(Array.from(b.normals));
      expect(Array.from(a.index)).toEqual(Array.from(b.index));
      expect(a.tightZones).toEqual(b.tightZones);
      for (const key of ['positions', 'normals', 'index'] as const) {
        expect(a[key].buffer).not.toBe(b[key].buffer);
        expect(a[key].buffer).not.toBe(
          (body.body as Record<string, { buffer: unknown }>)[key]?.buffer,
        );
      }
      a.positions.fill(0);
      structuredClone(a.index, { transfer: [a.index.buffer] });
      expect(b.positions.some((x) => x !== 0)).toBe(true);
      expect(body.body.positions.some((x) => x !== 0)).toBe(true);
    });

    it('ne modifie pas le corps ajusté', () => {
      const before = Array.from(body.body.positions.slice(0, 300));
      dressMannequin(body, pattern('straight-skirt'), { type: 'straight-skirt' });
      expect(Array.from(body.body.positions.slice(0, 300))).toEqual(before);
    });
  });

  describe('propriétés sur des mesures plausibles', () => {
    const sets: MeasurementSet[] = [
      { sex: 'female', statureMm: 1600, chestGirthMm: 860, waistGirthMm: 680, hipGirthMm: 930 },
      { sex: 'female', statureMm: 1750, chestGirthMm: 960, waistGirthMm: 800, hipGirthMm: 1060 },
      { sex: 'male', statureMm: 1800, chestGirthMm: 1020, waistGirthMm: 860, hipGirthMm: 1000 },
      { sex: 'male', statureMm: 1700, chestGirthMm: 940, waistGirthMm: 760, hipGirthMm: 960 },
    ];

    it.each(sets.map((s, i) => [i, s] as const))(
      'garde le vêtement hors du corps, sans valeur non finie (mesures %i)',
      (_i, set) => {
        const fitted = engine.fit(set);
        for (const type of ['straight-skirt', 'circle-skirt', 'trousers', 'bodice']) {
          const spec = pattern(type);
          const mesh = dressMannequin(fitted, spec, { type });
          expect(mesh.positions.every(Number.isFinite)).toBe(true);
          expect(deepestVertex(fitted, mesh)).toBeLessThan(INSIDE_TOLERANCE_CM);
          for (const z of mesh.tightZones) {
            expect(z.toMm).toBeGreaterThanOrEqual(z.fromMm);
            expect(z.shortfallMm).toBeGreaterThan(0);
          }
        }
      },
    );
  });
});

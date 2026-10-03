import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import type { GarmentSpec, MeasurementSet } from '@atelier/contracts-ts';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  dressMannequin,
  loadMannequinEngine,
  type ArmMm,
  type FittedMannequin,
  type GarmentMesh,
  type MannequinEngine,
} from '../src/index.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);
const fixture = (name: string): GarmentSpec =>
  JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
const GOLDEN = new URL('../../patterning/tests/golden/', import.meta.url);
/** Corsage à manches de référence du patronage (lecture seule). */
const sleeved = (): GarmentSpec =>
  JSON.parse(readFileSync(new URL('bodice-with-sleeves-reference.json', GOLDEN), 'utf8'));

const REFERENCE: MeasurementSet = {
  sex: 'female',
  statureMm: 1650,
  chestGirthMm: 880,
  waistGirthMm: 640,
  hipGirthMm: 960,
  crotchHeightMm: 770,
};

type V3 = [number, number, number];
const SEGMENTS = 72;
const RINGS = 48;
const TRUNK = RINGS * SEGMENTS;
/** Longueur de la manche de référence : ourlet (y = 0) à la couture de dessous de bras (y = 457,19). */
const SLEEVE_PATTERN_MM = 457.19;

const vertex = (m: { positions: Float32Array }, i: number): V3 => [
  m.positions[3 * i] as number,
  m.positions[3 * i + 1] as number,
  m.positions[3 * i + 2] as number,
];
const count = (m: { positions: Float32Array }): number => m.positions.length / 3;
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: V3, b: V3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const mm = (p: V3): V3 => [p[0] / 10, p[1] / 10, p[2] / 10];

/** Abscisse le long de l'axe du bras depuis le pivot et distance à l'axe, en cm. */
function alongArm(arm: ArmMm, p: V3): { t: number; d: number } {
  const v = sub(p, mm(arm.shoulder));
  const t = dot(v, arm.axis);
  return { t, d: Math.sqrt(Math.max(0, dot(v, v) - t * t)) };
}

/** Anneau r du tube dont le premier sommet est `first`. */
const ringOf = (m: { positions: Float32Array }, first: number, r: number): V3[] =>
  Array.from({ length: SEGMENTS }, (_, k) => vertex(m, first + r * SEGMENTS + k));

/** Profondeur (cm) d'un point (x, z) dans un polygone convexe direct ; négative dehors. */
function depthInside(ring: V3[], x: number, z: number): number {
  let depth = Infinity;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i] as V3;
    const b = ring[(i + 1) % ring.length] as V3;
    const len = Math.hypot(b[0] - a[0], b[2] - a[2]);
    depth = Math.min(depth, ((b[0] - a[0]) * (z - a[2]) - (b[2] - a[2]) * (x - a[0])) / len);
  }
  return depth;
}

const maxDiff = (a: GarmentMesh, b: GarmentMesh): number =>
  a.positions.length !== b.positions.length
    ? Infinity
    : Math.max(...Array.from(a.positions, (v, i) => Math.abs(v - (b.positions[i] as number))));

/** Sommets du corps qui sont du bras : au-delà de l'épaule (5 cm) et près de l'axe, ou au-delà du poignet. */
function armVertices(body: FittedMannequin, arm: ArmMm): V3[] {
  const out: V3[] = [];
  for (let v = 0; v < count(body.body); v++) {
    const p = vertex(body.body, v);
    const { t, d } = alongArm(arm, p);
    if (t >= 5 && (d < 12 || t > arm.lengthMm / 10)) out.push(p);
  }
  return out;
}

describe('habillage sur avatar à 90° (bras à l’horizontale)', () => {
  let engine: MannequinEngine;
  let low: FittedMannequin;
  let high: FittedMannequin;
  beforeAll(async () => {
    engine = await loadMannequinEngine(async () => new Uint8Array(await readFile(DATA)));
    low = engine.fit(REFERENCE, { armAngleDeg: 9 });
    high = engine.fit(REFERENCE, { armAngleDeg: 90 });
  });

  describe('tronc du corsage', () => {
    it('ne dépasse pas l’épaule de plus de l’aisance', () => {
      const mesh = dressMannequin(high, fixture('bodice'), { type: 'bodice' });
      const widest = Math.max(
        ...Array.from({ length: count(mesh) }, (_, i) => Math.abs(vertex(mesh, i)[0])),
      );
      // Aisance du patron de référence : moins de 30 mm au-delà du pivot de l'épaule.
      expect(widest).toBeLessThan(high.armsMm.left.shoulder[0] / 10 + 3);
    });

    it('ne contient aucun sommet de bras', () => {
      const mesh = dressMannequin(high, fixture('bodice'), { type: 'bodice' });
      const ys = Array.from({ length: RINGS }, (_, r) => vertex(mesh, r * SEGMENTS)[1] as number);
      const nearestRing = (y: number): number =>
        ys.reduce(
          (best, h, r) => (Math.abs(h - y) < Math.abs((ys[best] as number) - y) ? r : best),
          0,
        );
      let inside = 0;
      let seen = 0;
      for (const arm of [high.armsMm.left, high.armsMm.right]) {
        for (const p of armVertices(high, arm)) {
          if (p[1] > (ys[0] as number) || p[1] < (ys[RINGS - 1] as number)) continue;
          seen++;
          if (depthInside(ringOf(mesh, 0, nearestRing(p[1])), p[0], p[2]) > 0.1) inside++;
        }
      }
      expect(seen).toBeGreaterThan(100);
      expect(inside).toBe(0);
    });

    it('signale toujours la taille trop juste, sans zone au-dessus de l’aisselle', () => {
      const body = { ...REFERENCE, waistGirthMm: 740 };
      const tight = engine.fit(body, { armAngleDeg: 90 });
      const zones = dressMannequin(tight, fixture('bodice'), { type: 'bodice' }).tightZones;
      const zones9 = dressMannequin(engine.fit(body, { armAngleDeg: 9 }), fixture('bodice'), {
        type: 'bodice',
      }).tightZones;
      expect(zones.length).toBeGreaterThan(0);
      // Aisselle : sous le pivot de l'épaule, moins l'épaisseur du bras.
      expect(Math.max(...zones.map((z) => z.toMm))).toBeLessThan(
        tight.armsMm.left.shoulder[1] - 40,
      );
      expect(zones).toHaveLength(zones9.length);
      zones.forEach((z, i) => {
        expect(Math.abs(z.shortfallMm - (zones9[i]?.shortfallMm ?? Infinity))).toBeLessThan(5);
      });
    });
  });

  describe('manches', () => {
    const arms = (): ArmMm[] => [high.armsMm.left, high.armsMm.right];

    /** Centres des anneaux d'une manche (cm). */
    const centres = (mesh: GarmentMesh, side: number): V3[] =>
      Array.from({ length: RINGS }, (_, r) => {
        const ring = ringOf(mesh, TRUNK * (1 + side), r);
        return ([0, 1, 2] as const).map((q) => ring.reduce((a, p) => a + p[q], 0) / SEGMENTS) as V3;
      });

    /** Rayon d'un anneau de manche (cm). */
    const radiusOf = (mesh: GarmentMesh, side: number, r: number): number =>
      Math.hypot(
        ...sub(ringOf(mesh, TRUNK * (1 + side), r)[0] as V3, centres(mesh, side)[r] as V3),
      );
    /** Rayon du patron à la station r : tour de la manche à plat / 2π (cm). */
    const patternRadius = (r: number): number => {
      const panel = sleeved().panels.find(
        (p) => p.id === 'sleeve',
      ) as GarmentSpec['panels'][number];
      const y = SLEEVE_PATTERN_MM * (1 - r / (RINGS - 1));
      const xs: number[] = [];
      const poly = panel.edges.flatMap((e) => [e.from, e.to]);
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i] as number[];
        const b = poly[(i + 1) % poly.length] as number[];
        if ((a[1] as number) > y === (b[1] as number) > y) continue;
        xs.push(
          (a[0] as number) +
            ((y - (a[1] as number)) / ((b[1] as number) - (a[1] as number))) *
              ((b[0] as number) - (a[0] as number)),
        );
      }
      return (Math.max(...xs) - Math.min(...xs)) / 10 / (2 * Math.PI);
    };

    it('suivent le bras coudé (à moins de 80 mm de la corde) et prennent le rayon du patron au moins', () => {
      const mesh = dressMannequin(high, sleeved(), { type: 'bodice' });
      expect(count(mesh)).toBe(3 * TRUNK);
      arms().forEach((arm, side) => {
        centres(mesh, side).forEach((c, r) => {
          expect(alongArm(arm, c).d * 10).toBeLessThanOrEqual(80);
          expect(radiusOf(mesh, side, r)).toBeGreaterThanOrEqual(patternRadius(r) - 0.01);
        });
      });
    });

    it('mesure : rayon médian de la manche et stations forcées par le bras', () => {
      const mesh = dressMannequin(high, sleeved(), { type: 'bodice' });
      const radii = Array.from({ length: RINGS }, (_, r) => radiusOf(mesh, 0, r));
      const med = (a: number[]): number => a.slice().sort((x, y) => x - y)[RINGS / 2] as number;
      const patterns = radii.map((_, r) => patternRadius(r));
      const forced = radii.filter((x, r) => x > (patterns[r] as number) + 0.01).length;
      // Référence : le bras de l'avatar (rayon d'environ 4 cm) est plus large que la manche du patron
      // (3,4 cm) : écart médian d'environ 5 mm, 30 stations sur 48 forcées.
      expect(Math.abs(med(radii) - med(patterns)) * 10).toBeLessThan(8);
      expect(forced).toBeLessThanOrEqual(36);
    });

    it('ont la longueur du patron, ou celle demandée (à 10 mm près)', () => {
      const lengthOf = (mesh: GarmentMesh, side: number): number => {
        const c = centres(mesh, side);
        const arm = arms()[side] as ArmMm;
        return (alongArm(arm, c[RINGS - 1] as V3).t - alongArm(arm, c[0] as V3).t) * 10;
      };
      const pattern = dressMannequin(high, sleeved(), { type: 'bodice' });
      const asked = dressMannequin(high, sleeved(), { type: 'bodice' }, { sleeveLengthMm: 300 });
      for (const side of [0, 1]) {
        expect(Math.abs(lengthOf(pattern, side) - SLEEVE_PATTERN_MM)).toBeLessThanOrEqual(10);
        expect(Math.abs(lengthOf(asked, side) - 300)).toBeLessThanOrEqual(10);
      }
    });

    it('enveloppent le bras et ont des normales vers l’extérieur', () => {
      const mesh = dressMannequin(high, sleeved(), { type: 'bodice' });
      const c = centres(mesh, 0);
      for (let r = 1; r < RINGS; r += 7) {
        for (const [k, p] of ringOf(mesh, TRUNK, r).entries()) {
          const n = vertex({ positions: mesh.normals }, TRUNK + r * SEGMENTS + k);
          expect(dot(n, sub(p, c[r] as V3))).toBeGreaterThan(0);
        }
      }
      const arm = high.armsMm.left;
      const lengthCm = arm.lengthMm / 10;
      for (const p of armVertices(high, arm)) {
        const { t } = alongArm(arm, p);
        if (t < 8 || t > lengthCm - 2 || p[0] < 0) continue;
        const r = Math.min(RINGS - 1, Math.round((t / (SLEEVE_PATTERN_MM / 10)) * (RINGS - 1)));
        // Distance dans le plan de l'anneau, au centre de l'anneau : sous son rayon à 2 mm près.
        const enclosed = [r - 1, r, r + 1]
          .filter((q) => q >= 0 && q < RINGS)
          .some((q) => {
            const w = sub(p, c[q] as V3);
            const along = dot(w, arm.axis);
            const flat = Math.sqrt(Math.max(0, dot(w, w) - along * along));
            return flat < Math.hypot(...sub(ringOf(mesh, TRUNK, q)[0] as V3, c[q] as V3)) + 0.2;
          });
        expect(enclosed).toBe(true);
      }
    });

    it('sont absentes sans manche au patron', () => {
      const mesh = dressMannequin(high, fixture('bodice'), { type: 'bodice' });
      expect(count(mesh)).toBe(TRUNK);
    });
  });

  describe('jupes et pantalon', () => {
    it.each(['straight-skirt', 'circle-skirt', 'trousers'])(
      '%s est le même à 9° et à 90° (à 1 mm près)',
      (type) => {
        const a = dressMannequin(low, fixture(type), { type });
        const b = dressMannequin(high, fixture(type), { type });
        expect(maxDiff(a, b) * 10).toBeLessThanOrEqual(1);
      },
    );
  });

  describe('9° inchangé', () => {
    it.each(['straight-skirt', 'circle-skirt', 'trousers', 'bodice', 'bodice-sleeved'])(
      '%s : mêmes tableaux avec ou sans axes des bras',
      (name) => {
        const type = name.replace('-sleeved', '');
        const spec = name === 'bodice-sleeved' ? sleeved() : fixture(type);
        const withoutArms: Partial<FittedMannequin> = { ...low };
        delete withoutArms.armsMm;
        const a = dressMannequin(low, spec, { type });
        const b = dressMannequin(withoutArms as FittedMannequin, spec, { type });
        if (name === 'bodice-sleeved') expect(count(a)).toBe(TRUNK);
        expect(Array.from(a.positions)).toEqual(Array.from(b.positions));
        expect(a.tightZones).toEqual(b.tightZones);
      },
    );
  });
});

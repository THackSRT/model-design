import { beforeAll, describe, expect, it } from 'vitest';
import type { GarmentSpec } from '@atelier/contracts-ts';
import {
  assertPlacements,
  buildAvatar,
  drapeGarment,
  keepClearOfBody,
  loadAvatarEngine,
  placeGarment,
  PlacementError,
  type AvatarShape,
} from '../src/node.js';
import { meshGarment } from '../src/index.js';
import { vertexEase } from '../src/drape/metrics.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

describe('mise en place de la jupe droite autour du bassin', () => {
  let avatar: AvatarShape;
  const spec = fixture('straight-skirt');
  const mesh = meshGarment(spec, 'draft');
  let start: Float64Array;
  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, {});
    start = placeGarment(mesh, spec, avatar);
    keepClearOfBody(start, avatar.body);
  });

  const meanOf = (panelId: string, axis: 0 | 1 | 2): number => {
    const p = mesh.pieces.find((q) => q.panelId === panelId);
    if (!p) throw new Error('piece');
    let sum = 0;
    for (let v = p.vertexStart; v < p.vertexStart + p.vertexCount; v++)
      sum += start[3 * v + axis] as number;
    return sum / p.vertexCount;
  };

  it('pose chaque pièce du bon côté et dans le bon sens', () => {
    expect(meanOf('front', 2)).toBeGreaterThan(30); // devant : z > 0
    expect(meanOf('back-right', 2)).toBeLessThan(-30);
    expect(meanOf('back-left', 2)).toBeLessThan(-30);
    expect(meanOf('back-right', 0)).toBeLessThan(-20); // droite du porteur : x < 0
    expect(meanOf('back-left', 0)).toBeGreaterThan(20);
    expect(Math.abs(meanOf('front', 0))).toBeLessThan(5); // pièce dépliée centrée
  });

  it('tient autour du bassin, à clearanceMm près à la taille, sans aucun sommet dans le corps', () => {
    const ease = vertexEase(start, avatar.body, 0);
    expect(Math.min(...ease)).toBeGreaterThanOrEqual(0);
    const waist = avatar.landmarksMm.waist;
    const near: number[] = [];
    for (let v = 0; v < ease.length; v++) {
      if (Math.abs((start[3 * v + 1] as number) - waist) < 10) near.push(ease[v] as number);
    }
    near.sort((a, b) => a - b);
    expect(near.length).toBeGreaterThan(10);
    const median = near[near.length >> 1] as number;
    expect(median).toBeGreaterThan(29); // 30 mm moins l'arrondi des coins (< 1 mm)
    expect(median).toBeLessThan(60);
    // Hauteur : le haut de la pièce (y = 600) est à la hauteur de la taille.
    const top = Math.max(
      ...Array.from({ length: start.length / 3 }, (_, v) => start[3 * v + 1] as number),
    );
    expect(Math.abs(top - waist)).toBeLessThan(1);
  });

  it('est déterministe : mêmes bits', () => {
    const again = placeGarment(mesh, spec, avatar);
    keepClearOfBody(again, avatar.body);
    expect(Buffer.from(again.buffer).equals(Buffer.from(start.buffer))).toBe(true);
  });
});

describe('problèmes de mise en place', () => {
  beforeAll(async () => {
    await loadAvatarEngine();
  });

  it('placement-missing : une pièce sans placement', () => {
    const spec: GarmentSpec = structuredClone(fixture('straight-skirt'));
    delete (spec.panels[1] as { placement?: unknown }).placement;
    expect(() => assertPlacements(spec)).toThrow(PlacementError);
    const out = drapeGarment(jobOf(spec));
    expect(out).toEqual({
      ok: false,
      problem: { type: 'placement-missing', panelId: 'back-right' },
    });
  });

  it("placement-failed : un repère hors du corps (aucune coupe à la hauteur d'ancrage)", () => {
    const spec: GarmentSpec = structuredClone(fixture('straight-skirt'));
    for (const p of spec.panels) {
      const pl = p.placement as NonNullable<typeof p.placement>;
      pl.anchor.landmark = 'ankle';
      pl.anchor.offsetMm = -500;
    }
    const out = drapeGarment(jobOf(spec));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.problem.type).toBe('placement-failed');
      expect(JSON.stringify(out.problem)).not.toMatch(/1650|960|640/);
    }
  });
});

import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildAvatar,
  loadAvatarEngine,
  placeGarmentReport,
  type AvatarShape,
} from '../src/node.js';
import { meshGarment } from '../src/index.js';
import { DRAPE_SETTINGS, FLARE_RATIO, settingsFor } from '../src/drape/settings.js';
import { buildRing, godetProfile, ringLength, ringPoint } from '../src/placement/godets.js';
import { centroid, convexHull, offsetCurve, pointAt } from '../src/placement/hull.js';
import type { P2 } from '../src/placement/types.js';
import { fixture, MEASUREMENTS } from './drape-helpers.js';

// Départ en godets (ADR 0013, 1.19e2a4) : profil, longueur de la courbe ondulée, creux aux bouts, choix du réglage
// fin par le rapport tour fini / courbe, et départs inchangés des vêtements sans godets.

describe('profil d’un godet', () => {
  it('vaut 0 aux bouts, 1 au milieu, et reste dans [0, 1]', () => {
    expect(godetProfile(0)).toBe(0);
    expect(godetProfile(1)).toBe(0);
    expect(godetProfile(0.5)).toBe(1);
    for (let i = 0; i <= 20; i++) {
      expect(godetProfile(i / 20)).toBeGreaterThanOrEqual(0);
      expect(godetProfile(i / 20)).toBeLessThanOrEqual(1);
    }
  });
});

describe('anneau ondulé', () => {
  const hull = convexHull([
    [-200, -150],
    [200, -150],
    [200, 150],
    [-200, 150],
  ] as P2[]);
  const curve = offsetCurve(hull, 30);
  const level = { curve, centre: centroid(hull), startArc: curve.length / 4 };
  // Une pièce de 1 000 mm d'isoligne sur la moitié de la courbe (2 pièces de ce tour : 2 000 mm de tour fini).
  const line = {
    startArc: level.startArc,
    scale: curve.length / 2 / 1000,
    lo: -500,
    hi: 500,
    godets: 3,
  };
  const ring = buildRing(level, line);

  it('a une longueur égale à celle de l’isoligne à 0,5 mm près', () => {
    expect(ring.amplitude).toBeGreaterThan(0);
    expect(Math.abs(ringLength(ring) - 1000)).toBeLessThan(0.5);
  });

  it('a un creux à chaque bout : la courbe y rejoint celle du corps', () => {
    const start = ringPoint(ring, 0);
    const end = ringPoint(ring, ringLength(ring));
    const [from, to] = [pointAt(curve, ring.from), pointAt(curve, ring.to)];
    expect(Math.hypot(start[0] - from[0], start[1] - from[1])).toBeLessThan(1e-6);
    expect(Math.hypot(end[0] - to[0], end[1] - to[1])).toBeLessThan(1e-6);
  });

  it('avance à l’abscisse curviligne : deux points à 10 mm sont à 10 mm l’un de l’autre', () => {
    for (const ell of [100, 400, 700]) {
      const [a, b] = [ringPoint(ring, ell), ringPoint(ring, ell + 10)];
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeGreaterThan(9);
      expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(10.01);
    }
  });

  it('est sans onde quand la courbe suffit', () => {
    const flat = buildRing(level, { ...line, lo: -100, hi: 100, scale: 1.2 });
    expect(flat.amplitude).toBe(0);
  });
});

describe('réglage fin et départs', () => {
  let avatar: AvatarShape;

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, { armAngleDeg: 30 });
  });

  const report = (name: string) => {
    const spec = fixture(name);
    return placeGarmentReport(meshGarment(spec, 'draft'), spec, avatar);
  };
  const hashOf = (positions: Float64Array): string =>
    createHash('sha256').update(Buffer.from(positions.buffer)).digest('hex').slice(0, 16);

  it('est choisi pour la jupe cercle seulement', () => {
    expect(report('circle-skirt').flareRatio).toBeGreaterThanOrEqual(FLARE_RATIO);
    for (const name of ['straight-skirt', 'trousers', 'bodice', 'bodice-with-sleeves']) {
      expect(report(name).flareRatio).toBeLessThan(FLARE_RATIO);
    }
    const fine = settingsFor('draft', report('circle-skirt').flareRatio);
    expect(fine.substeps).toBe(50);
    expect(fine.iterations).toBe(1);
    expect(fine.sewingSteps).toBe(DRAPE_SETTINGS.draft.sewingSteps);
    expect(fine.maxSteps).toBe(DRAPE_SETTINGS.draft.maxSteps);
    expect(settingsFor('draft', 0)).toEqual(DRAPE_SETTINGS.draft);
    expect(settingsFor('standard', 1.2)).toEqual(DRAPE_SETTINGS.standard);
  });

  // Empreintes des positions de départ mesurées avant les godets (0.9.0), avatar par défaut.
  it('laisse identiques au bit près les départs des vêtements sans godets', () => {
    const hashes: Record<string, string> = {
      'straight-skirt': 'dbd65ce2406c5e4c',
      trousers: 'ece33e55f598baa4',
    };
    const plain = buildAvatar(MEASUREMENTS, {});
    for (const [name, expected] of Object.entries(hashes)) {
      const spec = fixture(name);
      const start = placeGarmentReport(meshGarment(spec, 'draft'), spec, plain).positionsMm;
      expect(hashOf(start)).toBe(expected);
    }
  });
});

import { beforeAll, describe, expect, it } from 'vitest';
import { buildAvatar, buildBody, loadAvatarEngine, type AvatarShape } from '../src/node.js';
import { validateBody } from '../src/core/validate.js';
import { createSectioner } from '../src/placement/section.js';
import { convexHull } from '../src/placement/hull.js';
import { MEASUREMENTS } from './drape-helpers.js';
import { sameBits } from './helpers.js';

function signedVolume(avatar: AvatarShape): number {
  const { positionsMm: p, triangles: t } = avatar.body;
  let vol = 0;
  for (let i = 0; i < t.length; i += 3) {
    const [a, b, c] = [3 * (t[i] as number), 3 * (t[i + 1] as number), 3 * (t[i + 2] as number)];
    const [ax, ay, az] = [p[a], p[a + 1], p[a + 2]] as number[];
    const [bx, by, bz] = [p[b], p[b + 1], p[b + 2]] as number[];
    const [cx, cy, cz] = [p[c], p[c + 1], p[c + 2]] as number[];
    vol +=
      ((ax as number) * ((by as number) * (cz as number) - (bz as number) * (cy as number)) -
        (ay as number) * ((bx as number) * (cz as number) - (bz as number) * (cx as number)) +
        (az as number) * ((bx as number) * (cy as number) - (by as number) * (cx as number))) /
      6;
  }
  return vol;
}

describe('avatar du drapé', () => {
  let avatar: AvatarShape;
  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, {});
  });

  it('rend un BodyMesh valide en millimètres', () => {
    expect(() => validateBody(avatar.body)).not.toThrow();
    const ys = avatar.body.positionsMm.filter((_, i) => i % 3 === 1);
    const stature = ys.reduce((m, y) => Math.max(m, y), -Infinity);
    expect(Math.abs(stature - MEASUREMENTS.statureMm)).toBeLessThan(0.01 * MEASUREMENTS.statureMm);
  });

  it('est fermé (chaque arête orientée a son opposée) avec des normales sortantes (volume positif)', () => {
    const t = avatar.body.triangles;
    const directed = new Set<number>();
    const n = avatar.body.positionsMm.length / 3;
    for (let i = 0; i < t.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        directed.add((t[i + k] as number) * n + (t[i + ((k + 1) % 3)] as number));
      }
    }
    let unmatched = 0;
    for (const e of directed) {
      const [a, b] = [Math.floor(e / n), e % n];
      if (!directed.has(b * n + a)) unmatched++;
    }
    expect(unmatched).toBe(0);
    expect(signedVolume(avatar)).toBeGreaterThan(1e7); // mm³ : plusieurs dizaines de litres
  });

  it('a un tour de taille proche de la mesure (enveloppe de la coupe à la hauteur du repère)', () => {
    const sect = createSectioner(avatar.body);
    const cr = sect.cut([0, avatar.landmarksMm.waist, 0], [0, 1, 0]);
    // Composante la plus étendue : le tronc.
    const pts: [number, number][] = [];
    for (let i = 0; i < cr.count; i++) {
      if (Math.abs(cr.xyz[3 * i] as number) < 140)
        pts.push([cr.xyz[3 * i] as number, cr.xyz[3 * i + 2] as number]);
    }
    const hull = convexHull(pts);
    let girth = 0;
    hull.forEach((p, i) => {
      const q = hull[(i + 1) % hull.length] as [number, number];
      girth += Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    expect(Math.abs(girth - MEASUREMENTS.waistGirthMm)).toBeLessThan(
      0.05 * MEASUREMENTS.waistGirthMm,
    );
  });

  it('donne des repères et des axes de bras en mm cohérents', () => {
    const l = avatar.landmarksMm;
    expect(l.ankle).toBeLessThan(l.knee);
    expect(l.knee).toBeLessThan(l.crotch);
    expect(l.crotch).toBeLessThan(l.waist);
    expect(l.waist).toBeLessThan(l.neck);
    expect(avatar.arms.left.shoulderMm[0]).toBeGreaterThan(0);
    expect(avatar.arms.right.shoulderMm[0]).toBeLessThan(0);
    expect(avatar.arms.left.lengthMm).toBeGreaterThan(300);
  });

  it('est déterministe : mêmes bits', () => {
    const again = buildBody(MEASUREMENTS, {});
    expect(sameBits(again.positionsMm, avatar.body.positionsMm)).toBe(true);
    expect(Array.from(again.triangles)).toEqual(Array.from(avatar.body.triangles));
  });
});

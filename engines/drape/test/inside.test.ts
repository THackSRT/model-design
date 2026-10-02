import { beforeAll, describe, expect, it } from 'vitest';
import { createInsideTest, isInsideBody } from '../src/core/inside.js';
import { simulate, type BodyMesh, type ClothMesh } from '../src/index.js';
import { buildAvatar, drapeGarment, loadAvatarEngine } from '../src/node.js';
import { vertexEase } from '../src/drape/metrics.js';
import { problemAfter } from '../src/drape/drape-garment.js';
import { PENETRATION_TOLERANCE_MM } from '../src/drape/settings.js';
import { costRatio, FABRIC, gridCloth, SETTINGS, sphereBody } from './helpers.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

/** Un seul triangle de tissu, posé en (x, y, z), et pas de pas : on lit la pénétration de l'état initial. */
function penetrationAt(body: BodyMesh, p: readonly [number, number, number]): number {
  const cloth: ClothMesh = gridCloth({ nx: 1, ny: 1, edgeMm: 1, place: () => p });
  return simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 0 }).maxPenetrationMm;
}

describe('test de parité sur un corps convexe', () => {
  const body = sphereBody([0, 0, 0], 150);

  it('sépare dedans et dehors, à toute profondeur', () => {
    const test = createInsideTest(body);
    expect(isInsideBody(test, 0, 0, 0)).toBe(true);
    expect(isInsideBody(test, 100, 50, -30)).toBe(true);
    expect(isInsideBody(test, 0, 160, 0)).toBe(false);
    expect(isInsideBody(test, 140, 100, 100)).toBe(false);
    expect(isInsideBody(test, 1e5, 0, 0)).toBe(false);
  });

  it('mesure une pénétration de 30 mm et de 55 mm, bien au-delà de la portée de collision', () => {
    expect(penetrationAt(body, [120.01, 0.4, 0.3])).toBeCloseTo(30, 0);
    expect(penetrationAt(body, [95.01, 0.4, 0.3])).toBeCloseTo(55, 0);
    expect(problemAfter({ maxPenetrationMm: 30 } as never)).toEqual({ type: 'body-penetration' });
  });

  it('ne voit aucune pénétration pour un sommet dehors, même tout près', () => {
    expect(penetrationAt(body, [152, 0.4, 0.3])).toBe(0);
    expect(penetrationAt(body, [0, 400, 0])).toBe(0);
  });

  it('ne contient rien pour un corps vide', () => {
    const empty = createInsideTest({
      positionsMm: new Float64Array(0),
      triangles: new Uint32Array(0),
    });
    expect(isInsideBody(empty, 0, 0, 0)).toBe(false);
  });
});

describe('creux concave entre deux masses', () => {
  it('un point dans l’interstice de deux sphères n’est pas dedans', () => {
    const a = sphereBody([-110, 0, 0], 100, 16, 32);
    const b = sphereBody([110, 0, 0], 100, 16, 32);
    const body: BodyMesh = {
      positionsMm: Float64Array.from([...a.positionsMm, ...b.positionsMm]),
      triangles: Uint32Array.from([
        ...a.triangles,
        ...Array.from(b.triangles, (i) => i + a.positionsMm.length / 3),
      ]),
    };
    expect(penetrationAt(body, [0, 0.3, 0.2])).toBe(0);
    expect(penetrationAt(body, [-110, 0.3, 0.2])).toBeGreaterThan(90);
  });
});

describe('avatar', () => {
  let body: BodyMesh;
  beforeAll(async () => {
    await loadAvatarEngine();
    body = buildAvatar(MEASUREMENTS, { armAngleDeg: 9 }).body;
  });

  /** Premier et dernier z dedans sur la droite (x, y), à 1 mm près. */
  function trunkDepthRange(x: number, y: number): [number, number] {
    const test = createInsideTest(body);
    let lo = Infinity;
    let hi = -Infinity;
    for (let z = -300; z <= 300; z += 0.5) {
      if (isInsideBody(test, x, y, z)) {
        lo = Math.min(lo, z);
        hi = Math.max(hi, z);
      }
    }
    return [lo, hi];
  }

  it('mesure des sommets à 30 mm et à 55 mm dans le tronc', () => {
    const [front, back] = trunkDepthRange(0, 1100);
    expect(Number.isFinite(front)).toBe(true);
    const near = penetrationAt(body, [0, 1100, front + 30]);
    const deep = penetrationAt(body, [0, 1100, front + 55]);
    expect(near).toBeGreaterThan(15);
    expect(near).toBeLessThan(35);
    expect(deep).toBeGreaterThan(near + 15);
    expect(deep).toBeLessThan(60);
    expect(back).toBeGreaterThan(front + 100);
    expect(near).toBeGreaterThan(PENETRATION_TOLERANCE_MM);
  });

  it('un sommet hors du corps dans le creux de l’aisselle n’est pas une pénétration', () => {
    const test = createInsideTest(body);
    let hollow: [number, number, number] | undefined;
    for (let y = 1100; y <= 1500 && !hollow; y += 10) {
      for (let z = -150; z <= 150 && !hollow; z += 10) hollow = gapBetweenMasses(test, y, z);
    }
    expect(hollow).toBeDefined();
    expect(penetrationAt(body, hollow as [number, number, number])).toBe(0);
  });

  it('donne une aisance négative aux sommets dedans, au-delà de 60 mm comme en deçà', () => {
    const [front] = trunkDepthRange(0, 1100);
    const pts = Float64Array.from([0, 1100, front + 30, 0, 1100, front + 55, 0, 1100, front - 20]);
    const ease = vertexEase(pts, body, 0.3);
    expect(ease[0]).toBeLessThan(-15);
    expect(ease[1]).toBeLessThan(-35);
    expect(ease[2]).toBeGreaterThan(10);
  });

  it('coûte peu rapporté à la charge de référence (budget relatif)', () => {
    const points = 20000;
    const ratio = costRatio(() => {
      const test = createInsideTest(body);
      let n = 0;
      for (let k = 0; k < points; k++) {
        if (isInsideBody(test, ((k * 37) % 800) - 400, (k * 53) % 1800, ((k * 29) % 600) - 300))
          n++;
      }
      expect(n).toBeGreaterThan(0);
    });
    expect(ratio).toBeLessThan(0.2); // mesuré 0 à 0,03 au repos
  });
});

/** Sur la droite x ↦ (x, y, z) : milieu d'un intervalle dehors entre deux intervalles dedans (creux), s'il existe. */
function gapBetweenMasses(
  test: ReturnType<typeof createInsideTest>,
  y: number,
  z: number,
): [number, number, number] | undefined {
  let state = 0; // 0 avant, 1 dedans, 2 dehors après dedans
  let gapStart = 0;
  for (let x = -600; x <= 600; x += 2) {
    const inside = isInsideBody(test, x, y, z);
    if (state === 0 && inside) state = 1;
    else if (state === 1 && !inside) {
      state = 2;
      gapStart = x;
    } else if (state === 2 && inside) {
      if (x - gapStart >= 6) return [(x + gapStart) / 2, y, z];
      state = 1;
    }
  }
  return undefined;
}

describe('corsage à manches sur l’avatar à 9°', () => {
  it('n’est plus rendu comme un succès avec des sommets dans le corps', async () => {
    await loadAvatarEngine();
    const out = drapeGarment(jobOf(fixture('bodice-with-sleeves'), { avatar: { armAngleDeg: 9 } }));
    if (out.ok) {
      expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-3);
      expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    } else {
      expect(['body-penetration', 'seam-not-closed']).toContain(out.problem.type);
    }
  });
});

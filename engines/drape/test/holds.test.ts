import { describe, expect, it } from 'vitest';
import {
  InvalidInputError,
  simulate,
  type BodyMesh,
  type ClothMesh,
  type Holds,
  type SimulationSettings,
} from '../src/index.js';
import { boxBody, FABRIC, gridCloth, NO_BODY, sameBits, SETTINGS } from './helpers.js';

// Nappe de 7 × 7 sommets à plat (plan xz) à 30 mm au-dessus d'un grand plateau dont le dessus est en y = 0.
const START_Y = 30;
const FLOOR: BodyMesh = boxBody([-300, -100, -300], [600, 0, 0], [0, 100, 0], [0, 0, 600]);
const SHEET = (): ClothMesh =>
  gridCloth({ nx: 6, ny: 6, edgeMm: 10, place: (u, v) => [u - 30, START_Y, v - 30] });

const SEWING = 20;
const RELEASE = 15;
const SETTLE: SimulationSettings = {
  ...SETTINGS,
  sewingSteps: SEWING,
  maxSteps: 400,
  iterations: 2,
  holdReleaseSteps: RELEASE,
};

/** Tient la hauteur de tous les sommets (axe Y, cible = hauteur de départ). */
function holdAll(cloth: ClothMesh): Holds {
  const n = cloth.flatMm.length / 2;
  return {
    vertices: Uint32Array.from({ length: n }, (_, i) => i),
    axes: Float64Array.from({ length: 3 * n }, (_, k) => (k % 3 === 1 ? 1 : 0)),
    targetsMm: new Float64Array(n).fill(START_Y),
  };
}

const heights = (x: Float64Array): number[] =>
  Array.from({ length: x.length / 3 }, (_, i) => x[3 * i + 1] as number);

describe('tenues XPBD relâchées', () => {
  it('garde la hauteur pendant la couture alors que sans tenue la nappe descend', () => {
    const cloth = SHEET();
    const during = { ...SETTLE, maxSteps: SEWING };
    const free = simulate(cloth, FLOOR, FABRIC, during);
    const held = simulate({ ...cloth, holds: holdAll(cloth) }, FLOOR, FABRIC, during);
    expect(Math.max(...heights(held.positionsMm).map((y) => Math.abs(y - START_Y)))).toBeLessThan(
      1,
    );
    expect(Math.min(...heights(free.positionsMm))).toBeLessThan(START_Y - 5);
  });

  it('tombe une fois relâchée et finit comme sans tenue, à 1 mm près', () => {
    const cloth = SHEET();
    const free = simulate(cloth, FLOOR, FABRIC, SETTLE);
    const held = simulate({ ...cloth, holds: holdAll(cloth) }, FLOOR, FABRIC, SETTLE);
    expect(held.converged).toBe(true);
    expect(held.steps).toBeGreaterThan(SEWING + RELEASE);
    expect(Math.max(...heights(held.positionsMm))).toBeLessThan(START_Y - 20);
    for (let i = 0; i < free.positionsMm.length; i++) {
      expect(
        Math.abs((held.positionsMm[i] as number) - (free.positionsMm[i] as number)),
      ).toBeLessThan(1);
    }
  });

  it('est déterministe au bit près avec des tenues', () => {
    const cloth = { ...SHEET(), holds: holdAll(SHEET()) };
    const a = simulate(cloth, FLOOR, FABRIC, SETTLE);
    const b = simulate(cloth, FLOOR, FABRIC, SETTLE);
    expect(sameBits(a.positionsMm, b.positionsMm)).toBe(true);
    expect(a.steps).toBe(b.steps);
  });

  it('sans tenue, rien ne change : aucune tenue, ou une liste vide, donnent les mêmes bits', () => {
    const cloth = SHEET();
    const plain = simulate(cloth, FLOOR, FABRIC, { ...SETTLE, holdReleaseSteps: undefined });
    const none = simulate(cloth, FLOOR, FABRIC, SETTLE);
    const empty: Holds = {
      vertices: new Uint32Array(0),
      axes: new Float64Array(0),
      targetsMm: new Float64Array(0),
    };
    const listed = simulate({ ...cloth, holds: empty }, FLOOR, FABRIC, SETTLE);
    expect(sameBits(none.positionsMm, plain.positionsMm)).toBe(true);
    expect(sameBits(listed.positionsMm, plain.positionsMm)).toBe(true);
    expect(none.steps).toBe(plain.steps);
  });

  it('l’arrêt au repos ne compte qu’après le relâchement', () => {
    const cloth = SHEET();
    const calm = { ...SETTLE, restSpeedMmPerS: 1e9, maxSteps: 400 };
    const held = simulate({ ...cloth, holds: holdAll(cloth) }, NO_BODY, FABRIC, calm);
    // Vitesse toujours sous le seuil : arrêt dès que 10 pas se sont écoulés après couture et relâchement.
    expect(held.steps).toBe(SEWING + RELEASE + 10);
    const free = simulate(cloth, NO_BODY, FABRIC, calm);
    expect(free.steps).toBe(SEWING + 10);
  });
});

describe('validation des tenues', () => {
  const cloth = SHEET();
  const ok = holdAll(cloth);
  const run = (holds: Holds, settings = SETTLE): void => {
    simulate({ ...cloth, holds }, FLOOR, FABRIC, { ...settings, maxSteps: 1 });
  };

  it('accepte des tenues valides', () => {
    expect(() => run(ok)).not.toThrow();
  });

  it('refuse un sommet hors des bornes', () => {
    const vertices = Uint32Array.from(ok.vertices);
    vertices[0] = 10_000;
    expect(() => run({ ...ok, vertices })).toThrow(InvalidInputError);
  });

  it('refuse un axe non unitaire ou de mauvaise taille', () => {
    const axes = Float64Array.from(ok.axes);
    axes[1] = 1.001;
    expect(() => run({ ...ok, axes })).toThrow(InvalidInputError);
    expect(() => run({ ...ok, axes: ok.axes.slice(3) })).toThrow(InvalidInputError);
  });

  it('refuse une cible non finie ou en nombre incorrect', () => {
    const targetsMm = Float64Array.from(ok.targetsMm);
    targetsMm[2] = Number.NaN;
    expect(() => run({ ...ok, targetsMm })).toThrow(InvalidInputError);
    expect(() => run({ ...ok, targetsMm: ok.targetsMm.slice(1) })).toThrow(InvalidInputError);
  });

  it.each([-1, 1.5, 1001, Number.NaN])('refuse holdReleaseSteps = %s', (steps) => {
    expect(() => run(ok, { ...SETTLE, holdReleaseSteps: steps })).toThrow(InvalidInputError);
  });
});

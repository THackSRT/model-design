import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  InvalidInputError,
  MAX_ITERATIONS,
  simulate,
  type FabricPhysics,
  type SimulationSettings,
} from '../src/index.js';
import { createLambdas, resetLambdas, solveStretch } from '../src/core/constraints.js';
import type { ClothModel } from '../src/core/topology.js';
import { boxBody, FABRIC, gridCloth, hexStripCloth, NO_BODY, SETTINGS } from './helpers.js';

function hangingElongation(settings: Partial<SimulationSettings>): number {
  const rows = 40;
  const edgeMm = 500 / ((rows * Math.sqrt(3)) / 2);
  const fabric: FabricPhysics = {
    ...FABRIC,
    weightGPerM2: 40775,
    stretchWarpPercent: 2,
    stretchWeftPercent: 2,
    bendingRigidityMicroNm: 1,
  };
  const cloth = hexStripCloth({ cols: 4, rows, edgeMm, place: (u, v) => [u, 500 - v, 0] });
  cloth.pinned = Uint32Array.from({ length: 4 }, (_, i) => i);
  const r = simulate(cloth, NO_BODY, fabric, { ...SETTINGS, maxSteps: 240, ...settings });
  const y = (j: number): number => r.positionsMm[3 * (4 * j) + 1] as number;
  return y(8) - y(rows) - ((rows - 8) * edgeMm * Math.sqrt(3)) / 2;
}

describe('iterations : cumul de λ par sous-pas', () => {
  it('sans `iterations`, la sortie est identique au bit près à celle du moteur 0.2.0', () => {
    const cloth = gridCloth({ nx: 6, ny: 6, edgeMm: 20, place: (u, v) => [u, 100, v] });
    cloth.pinned = Uint32Array.from([0, 6]);
    const r = simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, maxSteps: 30 });
    const hash = createHash('sha256').update(Buffer.from(r.positionsMm.buffer)).digest('hex');
    expect(hash).toBe('ec74c84705d387019bc09e6d4e19c7b9554462e7cbb5191ff28e0729379efae4');
    const one = simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, maxSteps: 30, iterations: 1 });
    expect(Buffer.from(one.positionsMm.buffer).equals(Buffer.from(r.positionsMm.buffer))).toBe(
      true,
    );
  });

  it("plusieurs itérations rapprochent l'allongement de la valeur attendue (même nombre de sous-pas)", () => {
    const expected = (0.02 * 400 * 400) / (2 * 500);
    const one = hangingElongation({ substeps: 2, iterations: 1 });
    const four = hangingElongation({ substeps: 2, iterations: 4 });
    expect(Math.abs(four - expected)).toBeLessThan(Math.abs(one - expected));
    expect(four).toBeLessThan(one);
  });

  it('est déterministe avec plusieurs itérations', () => {
    const a = hangingElongation({ substeps: 2, iterations: 3 });
    expect(hangingElongation({ substeps: 2, iterations: 3 })).toBe(a);
  });

  it('λ se cumule sur les itérations et se remet à zéro', () => {
    const model = {
      edgeVertices: Uint32Array.from([0, 1]),
      edgeRestMm: Float64Array.from([10]),
      edgeCompliance: Float64Array.from([0.5]),
      invMass: Float64Array.from([1, 1]),
      bendCompliance: new Float64Array(0),
      stitches: new Uint32Array(0),
    } as unknown as ClothModel;
    const x = Float64Array.from([0, 0, 0, 12, 0, 0]);
    const l = createLambdas(model);
    solveStretch(model, x, 1, l.stretch);
    const first = l.stretch[0] as number;
    expect(first).toBeLessThan(0);
    solveStretch(model, x, 1, l.stretch);
    const afterSecond = x[3] as number;
    solveStretch(model, x, 1, l.stretch);
    // Un seul ressort : le point fixe XPBD est atteint en une passe ; sans mémoire de λ, les passes suivantes
    // raccourciraient encore l'arête.
    expect(x[3]).toBeCloseTo(afterSecond, 12);
    expect(l.stretch[0]).toBeCloseTo(first, 12);
    resetLambdas(l);
    expect(l.stretch[0]).toBe(0);
  });

  it.each([0, -1, 1.5, Number.NaN, MAX_ITERATIONS + 1])('refuse iterations = %s', (iterations) => {
    const cloth = gridCloth({ nx: 2, ny: 2, edgeMm: 10, place: (u, v) => [u, 0, v] });
    const run = (): unknown => simulate(cloth, NO_BODY, FABRIC, { ...SETTINGS, iterations });
    expect(run).toThrow(InvalidInputError);
    expect(run).toThrow(RangeError);
  });

  it('accepte iterations = MAX_ITERATIONS', () => {
    const cloth = gridCloth({ nx: 2, ny: 2, edgeMm: 10, place: (u, v) => [u, 0, v] });
    const r = simulate(cloth, NO_BODY, FABRIC, {
      ...SETTINGS,
      maxSteps: 1,
      iterations: MAX_ITERATIONS,
    });
    expect(r.steps).toBe(1);
  });
});

describe('validation des indices de maillage', () => {
  const cloth = gridCloth({ nx: 2, ny: 2, edgeMm: 10, place: (u, v) => [u, 0, v] });
  const body = boxBody([-50, -100, -50], [100, 0, 0], [0, 100, 0], [0, 0, 100]);
  const withTri = (t: number[]) => ({ ...cloth, triangles: Uint32Array.from(t) });
  const fixGrain = (t: number[]) => ({
    ...withTri(t),
    grainUnit: new Float64Array((2 * t.length) / 3),
  });

  it.each([
    ['hors bornes', [0, 1, 9], /index 9 .* is not a vertex/],
    ['dégénéré (a = b)', [0, 0, 1], /repeats a vertex/],
    ['dégénéré (b = c)', [0, 1, 1], /repeats a vertex/],
    ['longueur non multiple de 3', [0, 1], /multiple of 3/],
  ])('refuse un triangle de tissu %s', (name, t, message) => {
    const mesh = name.startsWith('longueur') ? withTri(t) : fixGrain(t);
    const run = (): unknown => simulate(mesh, NO_BODY, FABRIC, SETTINGS);
    expect(run).toThrow(InvalidInputError);
    expect(run).toThrow(message);
  });

  it('refuse un indice non entier', () => {
    const bad = { ...fixGrain([0, 1, 2]), triangles: [0, 1, 1.5] as unknown as Uint32Array };
    expect(() => simulate(bad, NO_BODY, FABRIC, SETTINGS)).toThrow(/index 1.5 .* is not a vertex/);
  });

  it('refuse un triangle de corps hors bornes ou dégénéré', () => {
    const t = Array.from(body.triangles);
    const oob = { ...body, triangles: Uint32Array.from([...t.slice(0, 3), 0, 1, 99]) };
    expect(() => simulate(cloth, oob, FABRIC, SETTINGS)).toThrow(InvalidInputError);
    expect(() => simulate(cloth, oob, FABRIC, SETTINGS)).toThrow(/body\.triangles: index 99/);
    const degenerate = { ...body, triangles: Uint32Array.from([...t.slice(0, 3), 2, 2, 3]) };
    expect(() => simulate(cloth, degenerate, FABRIC, SETTINGS)).toThrow(
      /body\.triangles: triangle 1 repeats/,
    );
  });

  it('refuse des coutures ou sommets fixes hors bornes', () => {
    expect(() =>
      simulate({ ...cloth, stitches: Uint32Array.from([0, 50]) }, NO_BODY, FABRIC, SETTINGS),
    ).toThrow(/cloth\.stitches: index 50/);
    expect(() =>
      simulate({ ...cloth, pinned: Uint32Array.from([50]) }, NO_BODY, FABRIC, SETTINGS),
    ).toThrow(/cloth\.pinned: index 50/);
  });

  it('accepte un maillage valide', () => {
    expect(() => simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 1 })).not.toThrow();
  });
});

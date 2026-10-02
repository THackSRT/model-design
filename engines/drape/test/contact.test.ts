import { describe, expect, it } from 'vitest';
import { simulate, type FabricPhysics } from '../src/index.js';
import {
  boxBody,
  cpuSeconds,
  FABRIC,
  gridCloth,
  mergeCloths,
  SETTINGS,
  sphereBody,
  type Vec3,
} from './helpers.js';

const THICKNESS_MM = FABRIC.thicknessMm;

describe('simulate : collision avec le corps', () => {
  it('un carré lâché sur une sphère : aucun sommet à plus de 3 mm dans la sphère', () => {
    const radius = 100;
    const cloth = gridCloth({
      nx: 30,
      ny: 30,
      edgeMm: 10,
      place: (u, v) => [u - 150, radius + 60, v - 150],
    });
    const body = sphereBody([0, 0, 0], radius);
    const r = simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 90 });
    let deepest = 0;
    for (let v = 0; v < r.positionsMm.length / 3; v++) {
      const [x, y, z] = [
        r.positionsMm[3 * v],
        r.positionsMm[3 * v + 1],
        r.positionsMm[3 * v + 2],
      ] as Vec3;
      deepest = Math.max(deepest, radius - Math.sqrt(x * x + y * y + z * z));
    }
    expect(deepest).toBeLessThan(3);
    expect(r.maxPenetrationMm).toBeLessThan(3);
    // Il est bien tombé sur la sphère (et ne l'a pas traversée) : le centre repose sur le pôle.
    const center = 3 * (15 * 31 + 15);
    expect(r.positionsMm[center + 1] as number).toBeGreaterThan(radius);
    expect(r.positionsMm[center + 1] as number).toBeLessThan(radius + THICKNESS_MM + 6);
  });
});

/** Plan incliné de 30° (boîte épaisse) et petit carré de tissu posé dessus ; rend le glissement en mm le long de la pente. */
function slideOnIncline(friction: number): number {
  const angle = Math.PI / 6;
  const down: Vec3 = [Math.cos(angle), -Math.sin(angle), 0];
  const normal: Vec3 = [Math.sin(angle), Math.cos(angle), 0];
  const at = (a: number, n: number, z: number): Vec3 => [
    a * down[0] + n * normal[0],
    a * down[1] + n * normal[1],
    z,
  ];
  const origin = at(-1000, -50, -250);
  const e = (a: number, n: number, z: number): Vec3 => [
    a * down[0] + n * normal[0],
    a * down[1] + n * normal[1],
    z,
  ];
  const body = boxBody(origin, e(2000, 0, 0), e(0, 50, 0), e(0, 0, 500));
  const lift = THICKNESS_MM + 2; // posé à la distance de contact
  const cloth = gridCloth({
    nx: 10,
    ny: 10,
    edgeMm: 10,
    place: (u, v) => at(u - 50, lift, v - 50),
  });
  const fabric: FabricPhysics = { ...FABRIC, frictionCoefficient: friction };
  const r = simulate(cloth, body, fabric, { ...SETTINGS, maxSteps: 30 });
  const mid = 3 * (5 * 11 + 5);
  const moved = [0, 1, 2].map(
    (k) => (r.positionsMm[mid + k] as number) - (cloth.positionsMm[mid + k] as number),
  );
  return (moved[0] as number) * down[0] + (moved[1] as number) * down[1];
}

describe('simulate : frottement sur un plan incliné à 30°', () => {
  it('reste immobile avec μ = 0,8 (tan 30° = 0,58)', () => {
    expect(Math.abs(slideOnIncline(0.8))).toBeLessThan(1);
  });

  it('glisse avec μ = 0,1', () => {
    expect(slideOnIncline(0.1)).toBeGreaterThan(100);
  });
});

describe('simulate : coutures', () => {
  it("deux carrés cousus à 50 mm d'écart : écart inférieur à 1 mm à la fin", () => {
    const a = gridCloth({ nx: 10, ny: 10, edgeMm: 10, place: (u, v) => [u, 0, v] });
    const b = gridCloth({ nx: 10, ny: 10, edgeMm: 10, place: (u, v) => [u + 150, 0, v] });
    const pairs = Array.from({ length: 11 }, (_, j) => [10 + 11 * j, 11 * j] as const);
    const cloth = mergeCloths(a, b, pairs);
    const floor = boxBody([-500, -250, -300], [1500, 0, 0], [0, 100, 0], [0, 0, 700]);
    const r = simulate(cloth, floor, FABRIC, { ...SETTINGS, sewingSteps: 40, maxSteps: 150 });
    expect(r.maxStitchGapMm).toBeLessThan(1);
  });
});

describe('simulate : performance', () => {
  it('une grille de 70 × 70 sommets sur une sphère en moins de 10 s', () => {
    const radius = 150;
    const cloth = gridCloth({
      nx: 69,
      ny: 69,
      edgeMm: 5,
      place: (u, v) => [u - 172, radius + 40, v - 172],
    });
    const body = sphereBody([0, 0, 0], radius, 36, 72);
    let positionsLength = 0;
    const seconds = cpuSeconds(() => {
      positionsLength = simulate(cloth, body, FABRIC, { ...SETTINGS, maxSteps: 100 }).positionsMm
        .length;
    });
    expect(positionsLength).toBe(3 * 70 * 70);
    expect(seconds).toBeLessThan(10);
  });
});

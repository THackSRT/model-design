import { describe, expect, it } from 'vitest';
import { FABRIC_PRESETS, toXpbdParams, type FabricPhysics } from '../src/index.js';
import { buildClothModel } from '../src/core/topology.js';
import { FABRIC, gridCloth, hexStripCloth } from './helpers.js';

describe('préréglages de tissu', () => {
  it('couvrent les sept tissus du contrat, dans les bornes du contrat', () => {
    expect(Object.keys(FABRIC_PRESETS).sort()).toEqual(
      ['bazin', 'cotton-poplin', 'cotton-wax', 'denim', 'jersey', 'linen', 'silk-satin'].sort(),
    );
    for (const p of Object.values<FabricPhysics>(FABRIC_PRESETS)) {
      expect(p.weightGPerM2).toBeGreaterThanOrEqual(20);
      expect(p.weightGPerM2).toBeLessThanOrEqual(800);
      expect(p.thicknessMm).toBeGreaterThanOrEqual(0.1);
      expect(p.thicknessMm).toBeLessThanOrEqual(5);
      expect(p.stretchWarpPercent).toBeGreaterThan(0);
      expect(p.stretchWeftPercent).toBeLessThanOrEqual(100);
      expect(p.bendingRigidityMicroNm).toBeGreaterThan(0);
      expect(p.frictionCoefficient).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('conversion des unités physiques', () => {
  it('masse, tension et flexion en g, mm, s', () => {
    const p = toXpbdParams({
      ...FABRIC,
      weightGPerM2: 120,
      stretchWarpPercent: 2,
      stretchWeftPercent: 4,
      bendingRigidityMicroNm: 5,
    });
    expect(p.massPerAreaGPerMm2).toBeCloseTo(1.2e-4, 12);
    // 10 N sur 50 mm = 0,2 N/mm = 2e5 g/s² par mm ; divisé par l'allongement (2 % : 0,02).
    expect(p.stretchWarpGPerS2).toBeCloseTo(1e7, 0);
    expect(p.stretchWeftGPerS2).toBeCloseTo(5e6, 0);
    // 1 µN·m = 1e3 g·mm²/s².
    expect(p.bendingGMm2PerS2).toBeCloseTo(5e3, 6);
  });

  it("borne l'allongement minimal pour garder une souplesse finie", () => {
    const p = toXpbdParams({ ...FABRIC, stretchWarpPercent: 0 });
    expect(Number.isFinite(p.stretchWarpGPerS2)).toBe(true);
  });
});

describe('modèle du tissu', () => {
  const params = toXpbdParams(FABRIC);

  it('répartit la masse du tissu sur les sommets et immobilise les sommets fixes', () => {
    const cloth = gridCloth({ nx: 4, ny: 4, edgeMm: 10, place: (u, v) => [u, 0, v] });
    cloth.pinned = Uint32Array.from([0, 1]);
    const model = buildClothModel(cloth, params);
    const total = model.mass.reduce((s, m) => s + m, 0);
    expect(total).toBeCloseTo(params.massPerAreaGPerMm2 * 40 * 40, 9);
    expect(model.invMass[0]).toBe(0);
    expect(model.invMass[1]).toBe(0);
    expect(model.invMass[2]).toBeGreaterThan(0);
  });

  it("compte les arêtes et les stencils de flexion d'une grille", () => {
    const cloth = gridCloth({ nx: 4, ny: 3, edgeMm: 10, place: (u, v) => [u, 0, v] });
    const model = buildClothModel(cloth, params);
    // 4×3 cases : arêtes horizontales 4·4, verticales 5·3, diagonales 4·3 ; intérieures : tout sauf le bord (2·(4+3)).
    expect(model.edgeRestMm.length).toBe(16 + 15 + 12);
    expect(model.bendCompliance.length).toBe(16 + 15 + 12 - 14);
  });

  it("raideur d'arête d'un maillage équilatéral isotrope : tension × √3/2", () => {
    const cloth = hexStripCloth({
      cols: 4,
      rows: 6,
      edgeMm: 10,
      place: (u, v) => [u, 0, v],
      grain: [1, 0],
    });
    const iso = toXpbdParams({ ...FABRIC, stretchWarpPercent: 3, stretchWeftPercent: 3 });
    const model = buildClothModel(cloth, iso);
    const expected = 1 / (iso.stretchWarpGPerS2 * (Math.sqrt(3) / 2));
    const interior = Array.from(model.edgeCompliance).filter(
      (c) => Math.abs(c / expected - 1) < 1e-9,
    );
    expect(interior.length).toBeGreaterThan(20);
  });

  it('une arête à 90° du droit fil prend la raideur de la trame', () => {
    const cloth = gridCloth({
      nx: 2,
      ny: 2,
      edgeMm: 10,
      place: (u, v) => [u, 0, v],
      grain: [1, 0],
    });
    const p = toXpbdParams({ ...FABRIC, stretchWarpPercent: 2, stretchWeftPercent: 8 });
    const model = buildClothModel(cloth, p);
    const find = (a: number, b: number): number => {
      for (let e = 0; e < model.edgeRestMm.length; e++) {
        if (model.edgeVertices[2 * e] === a && model.edgeVertices[2 * e + 1] === b) return e;
      }
      return -1;
    };
    // (1, 2) horizontale, le long du droit fil (chaîne) ; (3, 6) verticale, en travers (trame) ; deux arêtes de bord.
    const along = model.edgeCompliance[find(1, 2)] as number;
    const across = model.edgeCompliance[find(0, 3)] as number;
    expect(across / along).toBeCloseTo(p.stretchWarpGPerS2 / p.stretchWeftGPerS2, 6);
  });
});

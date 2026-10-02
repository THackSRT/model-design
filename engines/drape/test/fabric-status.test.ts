import { fabricJsonSchema, type Fabric } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import {
  FABRIC_PRESETS,
  FABRIC_PRESET_STATUS,
  isFabricEstimated,
  resolveFabric,
  type FabricPresetName,
  type FabricPresetStatus,
} from '../src/index.js';
import { isFabricEstimatedWith } from '../src/core/fabric.js';

const NAMES = Object.keys(FABRIC_PRESETS) as FabricPresetName[];

function table(status: FabricPresetStatus): Record<FabricPresetName, FabricPresetStatus> {
  return Object.fromEntries(NAMES.map((n) => [n, status])) as Record<
    FabricPresetName,
    FabricPresetStatus
  >;
}

const ONE: Fabric = { preset: 'denim', thicknessMm: 0.7 };
const SOME: Fabric = {
  preset: 'denim',
  thicknessMm: 0.7,
  weightGPerM2: 300,
  frictionCoefficient: 0.4,
};
const ALL: Fabric = {
  preset: 'denim',
  weightGPerM2: 300,
  thicknessMm: 0.7,
  stretchWarpPercent: 2,
  stretchWeftPercent: 3,
  bendingRigidityMicroNm: 70,
  frictionCoefficient: 0.4,
};
const FIVE: Fabric = {
  preset: 'denim',
  weightGPerM2: 300,
  thicknessMm: 0.7,
  stretchWarpPercent: 2,
  stretchWeftPercent: 3,
  bendingRigidityMicroNm: 70,
};

describe('statut des préréglages', () => {
  it('couvre exactement les préréglages du moteur et ceux du contrat', () => {
    const contractEnum = (
      fabricJsonSchema.properties.preset as unknown as { enum: readonly string[] }
    ).enum;
    expect(Object.keys(FABRIC_PRESET_STATUS).sort()).toEqual(Object.keys(FABRIC_PRESETS).sort());
    expect(Object.keys(FABRIC_PRESET_STATUS).sort()).toEqual([...contractEnum].sort());
  });

  it("n'a aucun préréglage validé tant qu'aucun rapport n'est appliqué", () => {
    expect(Object.values(FABRIC_PRESET_STATUS).every((s) => s === 'estimated')).toBe(true);
  });
});

describe('isFabricEstimated', () => {
  it('estimé : vrai sans surcharge, avec quelques surcharges, avec cinq sur six', () => {
    for (const f of [{ preset: 'denim' } as Fabric, ONE, SOME, FIVE]) {
      expect(isFabricEstimated(f)).toBe(true);
      expect(isFabricEstimatedWith(f, table('estimated'))).toBe(true);
    }
  });

  it('estimé : faux si les six propriétés sont surchargées', () => {
    expect(isFabricEstimated(ALL)).toBe(false);
    expect(isFabricEstimatedWith(ALL, table('estimated'))).toBe(false);
  });

  it('validé : faux quelles que soient les surcharges', () => {
    const validated = table('validated');
    for (const f of [{ preset: 'denim' } as Fabric, ONE, SOME, FIVE, ALL]) {
      expect(isFabricEstimatedWith(f, validated)).toBe(false);
    }
  });

  it('la table injectée ne modifie pas la constante exportée', () => {
    isFabricEstimatedWith({ preset: 'jersey' }, table('validated'));
    expect(FABRIC_PRESET_STATUS.jersey).toBe('estimated');
  });
});

describe('resolveFabric', () => {
  it('sans surcharge : les valeurs du préréglage', () => {
    for (const name of NAMES) {
      expect(resolveFabric({ preset: name })).toEqual(FABRIC_PRESETS[name]);
    }
  });

  it("une surcharge l'emporte, les autres propriétés restent celles du préréglage", () => {
    const r = resolveFabric({ preset: 'denim', thicknessMm: 0.7, frictionCoefficient: 0 });
    expect(r).toEqual({ ...FABRIC_PRESETS.denim, thicknessMm: 0.7, frictionCoefficient: 0 });
  });

  it('toutes surchargées : aucune valeur du préréglage', () => {
    expect(resolveFabric(ALL)).toEqual({
      weightGPerM2: 300,
      thicknessMm: 0.7,
      stretchWarpPercent: 2,
      stretchWeftPercent: 3,
      bendingRigidityMicroNm: 70,
      frictionCoefficient: 0.4,
    });
  });
});

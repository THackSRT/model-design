import { describe, expect, it } from 'vitest';
import { addTarget, applyPair, macro, tri, youngShare } from '../src/core/morph.js';

const base = Float32Array.from([0, 0, 0, 1, 1, 1, 2, 2, 2]);
const data = {
  base,
  q: 0.5,
  targets: {
    'test/up': { idx: Uint16Array.from([1]), d: Int16Array.from([2, 4, 6]) },
    'measure/measure-waist-circ-incr': {
      idx: Uint16Array.from([0]),
      d: Int16Array.from([2, 0, 0]),
    },
    'measure/measure-waist-circ-decr': {
      idx: Uint16Array.from([0]),
      d: Int16Array.from([-2, 0, 0]),
    },
  },
};

describe('addTarget', () => {
  it('déplace les sommets touchés, pondérés par la quantification', () => {
    const pos = Float32Array.from(base);
    addTarget(data, pos, 'test/up', 2);
    expect([...pos]).toEqual([0, 0, 0, 3, 5, 7, 2, 2, 2]);
  });

  it('ignore un poids nul ou une cible inconnue', () => {
    const pos = Float32Array.from(base);
    addTarget(data, pos, 'test/up', 0);
    addTarget(data, pos, 'inconnue', 1);
    expect([...pos]).toEqual([...base]);
  });
});

describe('tri et youngShare', () => {
  it('répartit sur min / moyen / max avec une somme de 1', () => {
    for (let v = 0; v <= 1; v += 0.05) {
      const [a, b, c] = tri(v);
      expect(a + b + c).toBeCloseTo(1, 12);
    }
    expect(tri(0)).toEqual([1, 0, 0]);
    expect(tri(0.5)).toEqual([0, 1, 0]);
    expect(tri(1)).toEqual([0, 0, 1]);
  });

  it('borne la part « jeune » entre 0 et 1', () => {
    expect(youngShare(20)).toBe(1);
    expect(youngShare(25)).toBe(1);
    expect(youngShare(90)).toBe(0);
    expect(youngShare(120)).toBe(0);
    expect(youngShare(57.5)).toBeCloseTo(0.5, 12);
  });
});

describe('applyPair', () => {
  it('choisit la cible croissante ou décroissante selon le signe', () => {
    const up = Float32Array.from(base);
    applyPair(data, up, 'waist', 1);
    expect(up[0]).toBe(1);
    const down = Float32Array.from(base);
    applyPair(data, down, 'waist', -1);
    expect(down[0]).toBe(-1);
  });

  it('ne fait rien pour une valeur nulle', () => {
    const pos = Float32Array.from(base);
    applyPair(data, pos, 'waist', 0);
    expect([...pos]).toEqual([...base]);
  });
});

describe('macro', () => {
  const params = {
    gender: 0,
    age: 30,
    muscle: 0.5,
    weight: 0.5,
    african: 1,
    asian: 0,
    caucasian: 0,
  };

  it("rend les positions de base si aucune cible n'existe", () => {
    expect([...macro(data, params)]).toEqual([...base]);
  });

  it('mélange les cibles de macro selon sexe, âge, musculature et corpulence', () => {
    const one = { idx: Uint16Array.from([0]), d: Int16Array.from([2, 0, 0]) };
    const d = {
      ...data,
      targets: {
        'macrodetails/universal-female-young-averagemuscle-averageweight': one,
        'macrodetails/african-female-young': one,
      },
    };
    const pos = macro(d, { ...params, age: 20, african: 2 });
    // deux cibles de poids 1 chacune : 2 * 1 * q (0.5) = 1 chacune
    expect(pos[0]).toBeCloseTo(2, 6);
  });
});

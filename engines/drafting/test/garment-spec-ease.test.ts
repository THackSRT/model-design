import type { Edge, GarmentSpec, Notch } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { SeamError, SheetError, draftModel, toGarmentSpec } from '../src/index.js';
import type { DraftResult } from '../src/index.js';
import { sizeRequest } from './helpers.js';
import {
  FIT_MM,
  TARGET_KEY,
  armholeSeams,
  edgeOf,
  lengthOfEdge,
  sidesOf,
  specOf,
  totalLength,
} from './spec-helpers.js';

/** Un bord d'un parcours de couture : sa pièce, le bord, et s'il se parcourt à l'envers. */
interface Walked {
  panel: string;
  edge: Edge;
  reversed: boolean;
}

/** Position le long d'un parcours de bords du cran d'une pièce, donné par sa distance sur un de ses bords. */
function walkPosition(walk: Walked[], panel: string, notch: Notch): number {
  let before = 0;
  for (const step of walk) {
    const length = lengthOfEdge(step.edge);
    if (step.panel === panel && step.edge.id === notch.edgeId) {
      return before + (step.reversed ? length - notch.distanceMm : notch.distanceMm);
    }
    before += length;
  }
  return Number.NaN;
}

describe('crans de la tête de manche et des emmanchures', () => {
  /** Fraction de la couture où tombent les crans de l'emmanchure (devant puis dos) et ceux de la tête de manche. */
  function fractions(spec: GarmentSpec): {
    armhole: number[];
    cap: number[];
    capLength: number;
    armholeLength: number;
  } {
    const edgesOf = (panel: string, role: string): Walked[] =>
      (spec.panels.find((p) => p.id === panel)?.edges ?? [])
        .filter((e) => e.semanticRole === role)
        .map((edge) => ({ panel, edge, reversed: false }));
    const back = edgesOf('back', 'armhole')
      .reverse()
      .map((step) => ({ ...step, reversed: true }));
    const armholeWalk = [...edgesOf('front', 'armhole'), ...back];
    const capWalk = edgesOf('sleeve', 'sleeveCap');
    const armholeLength = totalLength(armholeWalk.map((step) => step.edge));
    const capLength = totalLength(capWalk.map((step) => step.edge));
    const notchesOf = (panel: string): Notch[] =>
      spec.panels.find((p) => p.id === panel)?.notches ?? [];
    const onArmhole = ['front', 'back'].flatMap((panel) =>
      notchesOf(panel).map((n) => walkPosition(armholeWalk, panel, n) / armholeLength),
    );
    const onCap = notchesOf('sleeve').map((n) => walkPosition(capWalk, 'sleeve', n) / capLength);
    return {
      armhole: onArmhole.sort((p, q) => p - q),
      cap: onCap.sort((p, q) => p - q),
      capLength,
      armholeLength,
    };
  }

  it.each([[{}], [{ sleevecapEase: 0.05 }], [{ sleevecapEase: 0.1 }]])(
    'tombent à la même fraction de la couture sur la tête et sur l’emmanchure (options %j)',
    (options) => {
      const spec = specOf('cisMaleAdult42', options);
      const { armhole, cap, capLength, armholeLength } = fractions(spec);
      expect(armhole).toHaveLength(3);
      expect(cap).toHaveLength(3);
      armhole.forEach((fraction, i) =>
        expect(Math.abs(fraction - (cap[i] as number)) * capLength).toBeLessThan(0.05),
      );
      expect(capLength).toBeGreaterThanOrEqual(armholeLength - FIT_MM);
    },
  );

  it('posent un cran simple à la carrure et à la pointe d’épaule du devant, un cran double à la carrure du dos', () => {
    const spec = specOf('cisMaleAdult42');
    const counts = (id: string) =>
      (spec.panels.find((p) => p.id === id)?.notches ?? []).map((n) => n.count);
    expect(counts('front')).toEqual([1, 1]);
    expect(counts('back')).toEqual([2]);
    expect(counts('sleeve')).toEqual([1, 1, 2]);
  });

  it('suivent l’embu : le cran de la tête est plus loin de l’aisselle que celui de l’emmanchure (embu compris)', () => {
    const plain = fractions(specOf('cisMaleAdult42'));
    const eased = fractions(specOf('cisMaleAdult42', { sleevecapEase: 0.1 }));
    expect(eased.capLength - plain.capLength).toBeGreaterThan(55);
    const specEased = specOf('cisMaleAdult42', { sleevecapEase: 0.1 });
    const frontNotch = specEased.panels[0]?.notches?.[0] as Notch;
    const capNotches = specEased.panels[2]?.notches ?? [];
    const armholeEdge = edgeOf(specEased, 'front', frontNotch.edgeId);
    const capEdge = edgeOf(specEased, 'sleeve', (capNotches[0] as Notch).edgeId);
    // Même rang de sous-bord, mais la tête est plus longue de l'embu : son cran est plus loin de son début.
    expect(lengthOfEdge(capEdge)).toBeGreaterThan(lengthOfEdge(armholeEdge));
    expect((capNotches[0] as Notch).distanceMm).toBeGreaterThan(frontNotch.distanceMm);
  });
});

describe('embu de la tête de manche : déclaré par la fiche, jamais déduit', () => {
  it.each([[0.05], [0.1]])(
    'déclare l’embu mesuré de chaque paire de sous-bords quand sleevecapEase vaut %f',
    (ease) => {
      const draft = draftModel(sizeRequest('cisMaleAdult42', { sleevecapEase: ease }));
      const spec = toGarmentSpec(draft);
      const seams = armholeSeams(spec);
      let declared = 0;
      for (const seam of seams) {
        const [a, b] = sidesOf(spec, seam);
        expect(seam.easeMm, seam.id).toBeDefined();
        expect(
          Math.abs((seam.easeMm as number) - (lengthOfEdge(a) - lengthOfEdge(b))),
        ).toBeLessThan(0.01);
        expect(seam.easeMm as number).toBeLessThanOrEqual(50);
        declared += seam.easeMm as number;
      }
      const lengthB = seams.reduce((sum, seam) => sum + lengthOfEdge(sidesOf(spec, seam)[1]), 0);
      // L'embu est la longueur visée moins les emmanchures, à l'ajustement de FreeSewing près.
      expect(
        Math.abs(declared - ((draft.values[TARGET_KEY] as number) - lengthB)),
      ).toBeLessThanOrEqual(FIT_MM);
      expect(declared).toBeGreaterThan(ease * 617 * 0.9);
    },
  );

  it('répartit l’embu au prorata de la longueur des sous-bords', () => {
    const spec = specOf('cisMaleAdult42', { sleevecapEase: 0.05 });
    const ratios = armholeSeams(spec).map((seam) => {
      const [a, b] = sidesOf(spec, seam);
      return lengthOfEdge(a) / lengthOfEdge(b);
    });
    // Les paires courtes (quelques mm) sont celles où l'arrondi à 0,001 mm pèse le plus.
    const mean = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
    for (const ratio of ratios) expect(Math.abs(ratio - mean)).toBeLessThan(0.01);
  });

  it('refuse un tracé dont la tête de manche s’écarte de la longueur visée de plus que la fiche ne le tolère', () => {
    const draft = draftModel(sizeRequest('cisMaleAdult42'));
    const target = draft.values[TARGET_KEY] as number;
    const attempt = (shift: number): GarmentSpec =>
      toGarmentSpec({ ...draft, values: { [TARGET_KEY]: target + shift } });
    // Au défaut, la tête mesure 1,5 mm de moins que la longueur visée : une cible 1 mm plus basse reste dans la tolérance.
    expect(() => attempt(-1)).not.toThrow();
    expect(() => attempt(5)).toThrow(SeamError);
    expect(() => attempt(5)).toThrow(
      'seam armhole: the length gap between the two sides differs from the declared ease',
    );
    try {
      attempt(-5);
      expect.unreachable();
    } catch (error) {
      expect(error).toMatchObject({ code: 'seam', seam: 'armhole' });
      // Aucune valeur de mesure dans le message (donnée personnelle).
      expect((error as Error).message).not.toMatch(/\d{3}/);
    }
  });

  it('refuse un tracé sans la valeur que la fiche déclare', () => {
    const draft: DraftResult = draftModel(sizeRequest('cisMaleAdult42'));
    expect(() => toGarmentSpec({ ...draft, values: {} })).toThrow(SheetError);
    expect(() => toGarmentSpec({ ...draft, values: {} })).toThrow(
      `store value "${TARGET_KEY}" was not read`,
    );
  });
});

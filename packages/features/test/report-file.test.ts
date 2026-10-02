import { type FabricValidationReport, jsonSchemas } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';

import {
  FABRIC_REPORT_MAX_BYTES,
  parseFabricValidationReport,
  serializeFabricValidationReport,
} from '../src/fabric-bench/report-file.js';

const physics = () => ({
  weightGPerM2: 120,
  thicknessMm: 0.3,
  stretchWarpPercent: 4,
  stretchWeftPercent: 6,
  bendingRigidityMicroNm: 80,
  frictionCoefficient: 0.5,
});

const sample = (): FabricValidationReport => ({
  schemaVersion: '1.0',
  createdAt: '2026-10-02T08:00:00.000Z',
  updatedAt: '2026-10-02T09:30:00.000Z',
  engineVersion: '0.1.0',
  reviews: [
    {
      preset: 'linen',
      verdict: 'corrected',
      reviewedAt: '2026-10-02T09:00:00.000Z',
      estimated: physics(),
      corrected: { ...physics(), weightGPerM2: 140 },
      measurements: {
        weighing: { sampleMassG: 0.5, sampleAreaMm2: 10000 },
        thickness: { readingsMm: [0.3, 0.31] },
        bendingWarp: { overhangLengthsMm: [40, 42, 41, 40] },
        friction: { slideAnglesDeg: [25, 27], counterSurface: 'dress-form-cover' },
        drape: { drapeCoefficient: 0.6, specimenDiameterMm: 300, discDiameterMm: 180 },
      },
      derived: { weightGPerM2: 140, thicknessMm: 0.305 },
      simulatedDrape: {
        estimated: {
          fabric: physics(),
          drapeCoefficient: 0.5,
          converged: true,
          simulatedSteps: 1200,
        },
      },
      comment: 'Tissu de test, tombé souple.',
    },
    {
      preset: 'denim',
      verdict: 'validated',
      reviewedAt: '2026-10-02T09:10:00.000Z',
      estimated: physics(),
    },
  ],
});

const set = (target: object, key: string, value: unknown): void => {
  (target as Record<string, unknown>)[key] = value;
};

const review = (
  r: FabricValidationReport,
  i: number,
): FabricValidationReport['reviews'][number] => {
  const found = r.reviews[i];
  if (!found) throw new Error('missing review');
  return found;
};

const mutated = (change: (r: FabricValidationReport) => void): string => {
  const report = sample();
  change(report);
  return JSON.stringify(report);
};

const invalid = (text: string): unknown => {
  const result = parseFabricValidationReport(text);
  return result.isErr() ? result.error : result.value;
};

describe('parseFabricValidationReport', () => {
  it('accepte un rapport complet et le rend tel quel', () => {
    const result = parseFabricValidationReport(JSON.stringify(sample()));
    expect(result.isOk() && result.value).toEqual(sample());
  });

  it('serialize puis parse rend un objet égal, avec un JSON stable', () => {
    const text = serializeFabricValidationReport(sample());
    expect(text.endsWith('}\n')).toBe(true);
    expect(text).toBe(JSON.stringify(sample(), null, 2) + '\n');
    const result = parseFabricValidationReport(text);
    expect(result.isOk() && result.value).toEqual(sample());
  });

  it('refuse un texte de plus de 256 Kio, mesuré en octets', () => {
    const ok = ' '.repeat(FABRIC_REPORT_MAX_BYTES - 2) + '{}';
    expect(invalid(ok)).not.toEqual({ code: 'too-large', maxBytes: FABRIC_REPORT_MAX_BYTES });
    const tooLarge = ' '.repeat(FABRIC_REPORT_MAX_BYTES + 1);
    expect(invalid(tooLarge)).toEqual({ code: 'too-large', maxBytes: FABRIC_REPORT_MAX_BYTES });
    // « é » pèse deux octets : 131 073 caractères dépassent la limite.
    const multibyte = JSON.stringify({ comment: 'é'.repeat(131_073) });
    expect(invalid(multibyte)).toEqual({ code: 'too-large', maxBytes: FABRIC_REPORT_MAX_BYTES });
  });

  it("refuse un texte qui n'est pas du JSON", () => {
    expect(invalid('{ pas du json')).toEqual({ code: 'not-json' });
    expect(invalid('')).toEqual({ code: 'not-json' });
  });

  it('refuse une autre version de rapport avant le reste', () => {
    const current = (
      jsonSchemas.fabricValidationReport.properties.schemaVersion as { const: string }
    ).const;
    expect(current).toBe(sample().schemaVersion);
    const text = mutated((r) => {
      set(r, 'schemaVersion', '9.9');
      set(r, 'reviews', 'tout est faux');
    });
    expect(invalid(text)).toEqual({ code: 'unsupported-version' });
  });

  it('refuse une racine qui est un tableau ou une valeur simple', () => {
    expect(invalid('[]')).toEqual({ code: 'invalid', path: '', keyword: 'type' });
    expect(invalid('null')).toEqual({ code: 'invalid', path: '', keyword: 'type' });
  });

  it('refuse une clé inconnue, avec son chemin', () => {
    const text = mutated((r) => {
      set(review(r, 0), 'extra', 1);
    });
    expect(invalid(text)).toEqual({
      code: 'invalid',
      path: '/reviews/0',
      keyword: 'additionalProperties',
    });
  });

  it('refuse une valeur hors bornes', () => {
    const text = mutated((r) => {
      review(r, 0).estimated.weightGPerM2 = 5000;
    });
    expect(invalid(text)).toEqual({
      code: 'invalid',
      path: '/reviews/0/estimated/weightGPerM2',
      keyword: 'maximum',
    });
  });

  it('refuse une date qui n’est pas en UTC ou qui n’existe pas', () => {
    const offset = mutated((r) => {
      review(r, 1).reviewedAt = '2026-10-02T09:10:00+02:00';
    });
    expect(invalid(offset)).toEqual({
      code: 'invalid',
      path: '/reviews/1/reviewedAt',
      keyword: 'pattern',
    });
    const absent = mutated((r) => {
      r.createdAt = '2026-02-30T00:00:00Z';
    });
    expect(invalid(absent)).toEqual({ code: 'invalid', path: '/createdAt', keyword: 'format' });
  });

  it('refuse le verdict corrected sans corrected', () => {
    const text = mutated((r) => {
      delete review(r, 0).corrected;
    });
    expect(invalid(text)).toEqual({ code: 'invalid', path: '/reviews/0', keyword: 'required' });
  });

  it('refuse corrected avec un autre verdict', () => {
    const text = mutated((r) => {
      review(r, 0).verdict = 'validated';
    });
    expect(invalid(text)).toEqual({
      code: 'invalid',
      path: '/reviews/0/corrected',
      keyword: 'false',
    });
  });

  it('refuse deux revues du même préréglage', () => {
    const text = mutated((r) => {
      review(r, 1).preset = 'linen';
    });
    expect(invalid(text)).toEqual({ code: 'duplicate-preset', preset: 'linen' });
  });

  it('refuse « __proto__ » en clé, sans pollution de prototype', () => {
    const text = serializeFabricValidationReport(sample()).replace(
      '"preset": "denim"',
      '"__proto__": {"polluted": true}, "preset": "denim"',
    );
    expect(text).toContain('"__proto__"');
    expect(invalid(text)).toEqual({
      code: 'invalid',
      path: '/reviews/1',
      keyword: 'additionalProperties',
    });
    expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
  });
});

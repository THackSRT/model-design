import { describe, expect, it } from 'vitest';

import {
  checkAgainst,
  checkSchema,
  SCHEMA_REGISTRY,
  SUPPORTED_KEYWORDS,
} from '../src/fabric-bench/schema-check.js';

/** Positions où un schéma contient des sous-schémas ; le reste de ses clés sont des mots-clés. */
const SUBSCHEMA_MAPS = ['properties', '$defs'] as const;
const SUBSCHEMA_SINGLE = ['items', 'if', 'then', 'else'] as const;

function collectKeywords(schema: unknown, found: Set<string>): void {
  if (typeof schema !== 'object' || schema === null) return;
  const node = schema as Record<string, unknown>;
  for (const key of Object.keys(node)) found.add(key);
  for (const map of SUBSCHEMA_MAPS) {
    const subs = node[map];
    if (typeof subs === 'object' && subs !== null) {
      for (const sub of Object.values(subs)) collectKeywords(sub, found);
    }
  }
  for (const single of SUBSCHEMA_SINGLE) collectKeywords(node[single], found);
}

describe('checkSchema', () => {
  it('accepte tous les mots-clés des schémas fabric-*', () => {
    const found = new Set<string>();
    for (const schema of Object.values(SCHEMA_REGISTRY)) collectKeywords(schema, found);
    expect(found.size).toBeGreaterThan(10);
    const unsupported = [...found].filter((k) => !SUPPORTED_KEYWORDS.has(k));
    expect(unsupported).toEqual([]);
  });

  it('le registre se limite aux six schémas fabric-*', () => {
    expect(Object.keys(SCHEMA_REGISTRY).sort()).toEqual([
      'fabric',
      'fabricBenchMeasurements',
      'fabricDerivedValues',
      'fabricPhysics',
      'fabricPresetReview',
      'fabricValidationReport',
    ]);
  });

  it('lève une erreur sur un $ref vers un fichier hors du registre', () => {
    expect(() => checkAgainst(1, { $ref: './cutting-plan.schema.json' }, 'fabric')).toThrow(
      /Unknown schema file/,
    );
  });

  it('compare enum et const par ===, sans sérialiser la valeur', () => {
    expect(checkAgainst('a', { enum: ['a', 'b'] }, 'fabric')).toBeUndefined();
    expect(checkAgainst(1, { const: 1 }, 'fabric')).toBeUndefined();
    expect(checkAgainst('1', { const: 1 }, 'fabric')).toEqual({ path: '', keyword: 'const' });
    const hostile = {
      toJSON: () => {
        throw new Error('sérialisé');
      },
    };
    expect(checkAgainst(hostile, { enum: ['a'] }, 'fabric')).toEqual({ path: '', keyword: 'enum' });
  });

  it('lève une erreur si un schéma attend une valeur objet', () => {
    expect(() => checkAgainst({}, { const: {} }, 'fabric')).toThrow(/object value/);
  });

  it('lève une erreur sur un mot-clé inconnu', () => {
    expect(() => checkAgainst(1, { type: 'number', multipleOf: 2 }, 'fabric')).toThrow(
      /multipleOf/,
    );
  });

  it('lève une erreur sur un $ref qui ne se résout pas', () => {
    expect(() => checkAgainst(1, { $ref: '#/$defs/Absent' }, 'fabric')).toThrow(/Unresolved/);
  });

  it('suit les $ref entre fichiers et rapporte le chemin', () => {
    expect(checkSchema({ preset: 'linen' }, 'fabric')).toBeUndefined();
    expect(checkSchema({ preset: 'tweed' }, 'fabric')).toEqual({
      path: '/preset',
      keyword: 'enum',
    });
    expect(checkSchema({ preset: 'linen', thicknessMm: 0.01 }, 'fabric')).toEqual({
      path: '/thicknessMm',
      keyword: 'minimum',
    });
  });

  it('gère minimum exclusif, tableaux et entiers', () => {
    const weighing = { sampleMassG: 0, sampleAreaMm2: 10000 };
    expect(checkSchema({ weighing }, 'fabricBenchMeasurements')).toEqual({
      path: '/weighing/sampleMassG',
      keyword: 'exclusiveMinimum',
    });
    expect(checkSchema({ thickness: { readingsMm: [] } }, 'fabricBenchMeasurements')).toEqual({
      path: '/thickness/readingsMm',
      keyword: 'minItems',
    });
    expect(
      checkSchema({ thickness: { readingsMm: [0.3, 99] } }, 'fabricBenchMeasurements'),
    ).toEqual({
      path: '/thickness/readingsMm/1',
      keyword: 'maximum',
    });
  });

  it('compte minLength et maxLength en points de code', () => {
    const maxLength = { type: 'string', maxLength: 500 };
    const emojis = '😀'.repeat(500);
    expect(emojis.length).toBe(1000);
    expect(checkAgainst(emojis, maxLength, 'fabric')).toBeUndefined();
    expect(checkAgainst('😀'.repeat(501), maxLength, 'fabric')).toEqual({
      path: '',
      keyword: 'maxLength',
    });
    expect(checkAgainst('😀', { minLength: 1 }, 'fabric')).toBeUndefined();
    expect(checkAgainst('😀', { minLength: 2 }, 'fabric')).toEqual({
      path: '',
      keyword: 'minLength',
    });
    expect(checkAgainst('\ud83d', { maxLength: 1 }, 'fabric')).toBeUndefined();
  });

  it('gère les schémas booléens et les types', () => {
    expect(checkAgainst(1, false, 'fabric')).toEqual({ path: '', keyword: 'false' });
    expect(checkAgainst(1, true, 'fabric')).toBeUndefined();
    expect(checkAgainst(1.5, { type: 'integer' }, 'fabric')).toEqual({ path: '', keyword: 'type' });
    expect(checkAgainst(null, { type: 'object' }, 'fabric')).toEqual({ path: '', keyword: 'type' });
    expect(checkAgainst('ab', { type: 'string', maxLength: 1 }, 'fabric')).toEqual({
      path: '',
      keyword: 'maxLength',
    });
  });
});

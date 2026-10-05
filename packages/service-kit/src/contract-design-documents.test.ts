import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { DesignDocument } from '@atelier/contracts-ts';
import { designOperationJsonSchema } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { contractValidator } from './validation.js';

// Suite de contract-examples.test.ts (limite de 300 lignes par fichier), mêmes entrées Nx : contracts/examples/.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const readJson = (path: string): unknown => JSON.parse(readFileSync(`${ROOT}${path}`, 'utf8'));
const jsonFiles = (dir: string): string[] =>
  readdirSync(`${ROOT}${dir}`)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => `${dir}/${name}`);

// Document de modèle 1.0 : documents de référence (essai des tuniques) et refus, avec le même valideur.
// L'unicité des id et les renvois aux matières, que JSON Schema ne sait pas dire, sont vérifiés au rejeu (drafting).
const DOCUMENTS = jsonFiles('contracts/examples/design-documents');
const validateDocument = contractValidator<DesignDocument>('designDocument');
const documentErrors = (input: unknown): string[] => {
  const result = validateDocument(input);
  return result.isErr() ? (result.error.errors ?? []) : [];
};
const NEUTRAL = readJson('contracts/examples/design-documents/tunic-0-neutral.json') as object;
const withOps = (...operations: object[]): unknown => ({ ...NEUTRAL, operations });
const points = (count: number): object[] =>
  Array.from({ length: count }, (_, i) => ({ xMm: i, yMm: i }));
const citedMaterials = (value: unknown): string[] =>
  typeof value !== 'object' || value === null
    ? []
    : Object.entries(value).flatMap(([key, v]) =>
        key === 'material' && typeof v === 'string' ? [v] : citedMaterials(v),
      );

// Valeurs du tableau de tailles de FreeSewing (homme, cou 42), pas celles d'une personne.
const MALE_42 = {
  sex: 'male',
  statureMm: 1800,
  chestGirthMm: 1105,
  waistGirthMm: 882,
  hipGirthMm: 1084,
};
const region = (name: string, insidePoint?: object): object =>
  insidePoint ? { name, material: 'main', insidePoint } : { name, material: 'main' };
const EVERY_OPERATION = [
  { id: 'hem', op: 'hemShape', flareMm: 30, curveMm: 20 },
  { id: 'neck', op: 'neckline', shape: 'v', vDepthMm: 200, enabled: false },
  { id: 'sleeve', op: 'sleeveLength', lengthMm: 300 },
  { id: 'cuff', op: 'cuff' },
  { id: 'slits', op: 'sideSlit' },
  { id: 'band', op: 'band', edge: 'hem', heightMm: 40, material: 'main', name: 'Bande' },
  {
    id: 'u',
    op: 'styleLine',
    line: { preset: 'u', depthMm: 258, shoulderXMm: 196 },
    region: region('Plastron'),
  },
  {
    id: 'yoke',
    op: 'styleLine',
    piece: 'back',
    line: { preset: 'yoke', depthMm: 200 },
    region: region('Empiècement dos', { landmark: 'centerNeck', dyMm: 40 }),
  },
  {
    id: 'free',
    op: 'styleLine',
    piece: 'sleeve',
    extendMm: 40,
    line: {
      points: [
        { edge: 'underarm', fraction: 0.5 },
        { edge: 'sleeveCap', xMm: 0 },
      ],
    },
    region: region('Haut de manche', { xMm: 0, yMm: 20 }),
  },
  { id: 'slit', op: 'neckSlit' },
  { id: 'placket', op: 'placket', lengthMm: 200 },
  { id: 'pocket', op: 'pocket', side: 'right', shape: 'pointed' },
  {
    id: 'trim',
    op: 'trim',
    material: 'main',
    path: {
      smooth: true,
      points: [
        { landmark: 'shoulderPoint', xFraction: 0.5 },
        { edge: 'hem', fraction: 0.5 },
      ],
    },
  },
  { id: 'embroidery', op: 'embroidery', material: 'main' },
];

describe('DesignDocument 1.0 : documents de référence', () => {
  it('les six documents sont valides : tunique neutre et cinq tuniques de l’essai', () => {
    expect(DOCUMENTS).toHaveLength(6);
    for (const path of DOCUMENTS) expect(documentErrors(readJson(path)), path).toEqual([]);
    const counts = DOCUMENTS.map((path) => (readJson(path) as DesignDocument).operations.length);
    expect(counts).toEqual([0, 7, 6, 6, 5, 6]);
  });

  it('chaque document a des id uniques et ne cite que des matières de sa table', () => {
    for (const path of DOCUMENTS) {
      const doc = readJson(path) as DesignDocument;
      const ids = doc.operations.map((operation) => operation.id);
      expect(new Set(ids).size, path).toBe(ids.length);
      for (const key of citedMaterials(doc.operations))
        expect(doc.materials, path).toHaveProperty(key);
    }
  });

  it('chaque opération et chaque paramètre a une description en français', () => {
    type Node = { description?: string; $ref?: string; properties?: Record<string, Node> };
    const defs = designOperationJsonSchema.$defs as Record<string, Node>;
    const local = (ref = ''): Node | undefined => defs[ref.replace('#/$defs/', '')];
    expect(designOperationJsonSchema.oneOf).toHaveLength(12);
    for (const [name, def] of Object.entries(defs)) {
      expect(def.description, name).toMatch(/ (au|de|des|du|en|et|la|le|les|sa|une?) /i);
      for (const [key, param] of Object.entries(def.properties ?? {}))
        expect(param.description ?? local(param.$ref)?.description, `${name}.${key}`).toBeTruthy();
    }
  });

  it('accepte chaque opération, chaque genre de point ancré et un jeu de mesures', () => {
    const doc = {
      ...NEUTRAL,
      measurements: { measurementSet: MALE_42 },
      operations: EVERY_OPERATION,
    };
    expect(documentErrors(doc)).toEqual([]);
    const ops = new Set(EVERY_OPERATION.map((operation) => operation.op));
    expect(ops.size).toBe(designOperationJsonSchema.oneOf.length);
  });
});

// Valideur des services (Ajv avec l'option discriminator) : un refus donne un seul message, qui nomme le chemin et
// la règle ; seules les unions sans marque (options de la base, mesures) en donnent un par branche.
describe('DesignDocument 1.0 : refus, message à l’appui', () => {
  const many = Array.from({ length: 65 }, (_, i) => ({ id: `slit-${i}`, op: 'sideSlit' }));
  const material = { name: 'Uni', kind: 'plain', colors: ['#ffffff'] };
  const materials = Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`m${i}`, material]));
  it.each([
    [
      'une opération inconnue',
      withOps({ id: 'a', op: 'collar' }),
      '/operations/0 value of tag "op" must be in oneOf',
    ],
    ['une opération sans op', withOps({ id: 'a' }), '/operations/0 tag "op" must be string'],
    [
      'un paramètre hors bornes',
      withOps({ id: 'a', op: 'neckline', lowerMm: 400 }),
      '/operations/0/lowerMm must be <= 250',
    ],
    [
      'un paramètre inconnu',
      withOps({ id: 'a', op: 'sideSlit', widthMm: 10 }),
      '/operations/0 must NOT have additional properties',
    ],
    [
      'un identifiant mal formé',
      withOps({ id: 'a b', op: 'sideSlit' }),
      '/operations/0/id must match pattern "^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$"',
    ],
    [
      'une opération en double',
      withOps({ id: 'a', op: 'sideSlit' }, { id: 'a', op: 'sideSlit' }),
      '/operations must NOT have duplicate items (items ## 0 and 1 are identical)',
    ],
    ['65 opérations', withOps(...many), '/operations must NOT have more than 64 items'],
    [
      'un chemin de 33 points',
      withOps({ id: 'a', op: 'trim', material: 'main', path: { points: points(33) } }),
      '/operations/0/path/points must NOT have more than 32 items',
    ],
    [
      'un nom de 81 caractères',
      withOps({
        id: 'a',
        op: 'band',
        edge: 'hem',
        heightMm: 40,
        material: 'main',
        name: 'x'.repeat(81),
      }),
      '/operations/0/name must NOT have more than 80 characters',
    ],
    [
      '21 matières',
      { ...NEUTRAL, materials: { ...materials, main: material } },
      '/materials must NOT have more than 20 properties',
    ],
    [
      'une table sans matière principale',
      { ...NEUTRAL, materials: { light: material } },
      "/materials must have required property 'main'",
    ],
    [
      'une base hors du catalogue',
      { ...NEUTRAL, base: { key: 'penelope', freesewingVersion: '4.10.2' } },
      '/base/key must be equal to one of the allowed values',
    ],
    [
      'une couleur en majuscules',
      { ...NEUTRAL, materials: { main: { ...material, colors: ['#FFFFFF'] } } },
      '/materials/main/colors/0 must match pattern "^#[0-9a-f]{6}$"',
    ],
  ])('refuse %s, en un seul message', (_, input, message) => {
    expect(documentErrors(input)).toEqual([message]);
  });

  it.each([
    [
      'une option de base qui n’est pas une valeur simple',
      {
        ...NEUTRAL,
        base: { key: 'brian', freesewingVersion: '4.10.2', options: { chestEase: { pct: 15 } } },
      },
      '/base/options/chestEase must match a schema in anyOf',
    ],
    [
      'une taille et un jeu de mesures à la fois',
      { ...NEUTRAL, measurements: { size: 'cisMaleAdult42', measurementSet: MALE_42 } },
      '/measurements must match exactly one schema in oneOf',
    ],
  ])('refuse %s', (_, input, message) => {
    expect(documentErrors(input)).toContain(message);
  });
});

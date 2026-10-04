import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { GarmentSpec } from '@atelier/contracts-ts';
import { describe, expect, it } from 'vitest';
import { contractValidator } from './validation.js';

// Contenu des contrats GarmentSpec 1.1 et MeasurementSet, vérifié avec le valideur des services : exemples de
// contracts/examples/ et références golden du patronage, lus dans le dépôt.
const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const readJson = (path: string): unknown => JSON.parse(readFileSync(`${ROOT}${path}`, 'utf8'));
const jsonFiles = (dir: string): string[] =>
  readdirSync(`${ROOT}${dir}`)
    .filter((name) => name.endsWith('.json'))
    .map((name) => `${dir}/${name}`);

const GOLDEN_SPECS = jsonFiles('engines/patterning/tests/golden').filter((path) =>
  path.endsWith('-reference.json'),
);
const EXAMPLE_SPECS = jsonFiles('contracts/examples/garment-specs');
const TUNIC = 'contracts/examples/garment-specs/tunic.json';

const validateSpec = contractValidator<GarmentSpec>('garmentSpec');
const specErrors = (input: unknown): string[] => {
  const result = validateSpec(input);
  return result.isErr() ? (result.error.errors ?? []) : [];
};

describe('GarmentSpec : compatibilité de la version 1.1', () => {
  it('chaque référence golden du patronage (1.0) reste valide', () => {
    expect(GOLDEN_SPECS.length).toBeGreaterThanOrEqual(5);
    for (const path of GOLDEN_SPECS) expect(specErrors(readJson(path)), path).toEqual([]);
  });

  it('chaque exemple de contracts/examples/garment-specs est valide', () => {
    expect(EXAMPLE_SPECS).toContain(TUNIC);
    for (const path of EXAMPLE_SPECS) expect(specErrors(readJson(path)), path).toEqual([]);
  });

  it("l'exemple de tunique emploie chaque champ de la version 1.1", () => {
    const spec = readJson(TUNIC) as GarmentSpec;
    const marks = spec.panels.flatMap((panel) => panel.marks ?? []);
    const edges = spec.panels.flatMap((panel) => panel.edges);
    expect(spec.specVersion).toBe('1.1');
    expect(spec.panels.some((panel) => panel.interfaced === true)).toBe(true);
    expect(edges.some((edge) => edge.semanticRole !== undefined)).toBe(true);
    expect(new Set(marks.map((mark) => mark.kind))).toEqual(
      new Set(['line', 'outline', 'button', 'slit', 'zone', 'fold']),
    );
    expect(new Set(marks.map((mark) => mark.copy))).toEqual(
      new Set([undefined, 'drawn', 'mirrored']),
    );
    expect(marks.some((mark) => mark.kind === 'line' && mark.widthMm !== undefined)).toBe(true);
    expect(marks.some((mark) => mark.kind === 'button' && mark.diameterMm !== undefined)).toBe(
      true,
    );
  });

  it("l'exemple de tunique ne cite que des matières de sa table", () => {
    const spec = readJson(TUNIC) as GarmentSpec;
    const cited = spec.panels.flatMap((panel) => [
      panel.material,
      ...(panel.marks ?? []).map((mark) => (mark.kind === 'line' ? mark.material : undefined)),
    ]);
    const keys = Object.keys(spec.materials ?? {});
    expect(cited.filter((key) => key !== undefined).length).toBeGreaterThan(1);
    for (const key of cited) if (key !== undefined) expect(keys, key).toContain(key);
  });
});

const EDGES = [
  { id: 'bottom', from: [0, 0], to: [100, 0] },
  { id: 'diagonal', from: [100, 0], to: [0, 100] },
  { id: 'left', from: [0, 100], to: [0, 0] },
];
const spec11 = (panel: object = {}, top: object = {}): unknown => ({
  specVersion: '1.1',
  unit: 'mm',
  engine: { name: 'test', version: '1' },
  garment: { type: 'test' },
  panels: [{ id: 'piece', name: 'Pièce', edges: EDGES, quantity: 1, ...panel }],
  seams: [],
  ...top,
});
const withMark = (mark: object): unknown => spec11({ marks: [mark] });

describe('GarmentSpec 1.1 : champs ajoutés', () => {
  it('accepte une pièce minimale en 1.0 comme en 1.1', () => {
    expect(specErrors(spec11())).toEqual([]);
    expect(specErrors(spec11({}, { specVersion: '1.0' }))).toEqual([]);
  });

  it('accepte une matière, un rôle sémantique et une marque de chaque genre', () => {
    const marks = [
      {
        kind: 'line',
        points: [
          [0, 10],
          [50, 10],
        ],
        material: 'trim',
        widthMm: 30,
        copy: 'drawn',
      },
      {
        kind: 'outline',
        points: [
          [5, 5],
          [20, 5],
          [5, 20],
        ],
        label: 'poche',
      },
      { kind: 'button', points: [[10, 10]], diameterMm: 12, copy: 'mirrored' },
      {
        kind: 'slit',
        points: [
          [0, 50],
          [0, 20],
        ],
      },
      {
        kind: 'zone',
        points: [
          [0, 60],
          [10, 60],
          [0, 70],
        ],
        label: "zone d'ornement",
      },
      {
        kind: 'fold',
        points: [
          [0, 40],
          [40, 40],
        ],
      },
    ];
    const edges = EDGES.map((edge) => ({ ...edge, semanticRole: 'styleLine' }));
    const materials = { main: { name: 'Coton blanc' }, trim: { name: 'Galon rayé' } };
    const input = spec11({ edges, material: 'main', interfaced: true, marks }, { materials });
    expect(specErrors(input)).toEqual([]);
  });

  it.each([
    ['une version inconnue', spec11({}, { specVersion: '1.2' })],
    [
      'un rôle sémantique inconnu',
      spec11({ edges: EDGES.map((e) => ({ ...e, semanticRole: 'x' })) }),
    ],
    ['une clé de matière mal formée', spec11({ material: 'Coton blanc' })],
    ['un nom de matière vide', spec11({}, { materials: { main: { name: '' } } })],
    [
      'une marque de genre inconnu',
      withMark({
        kind: 'pleat',
        points: [
          [0, 0],
          [1, 1],
        ],
      }),
    ],
    [
      'un bouton à deux points',
      withMark({
        kind: 'button',
        points: [
          [0, 0],
          [1, 1],
        ],
      }),
    ],
    ['une fente à un seul point', withMark({ kind: 'slit', points: [[0, 0]] })],
    [
      'un contour à deux points',
      withMark({
        kind: 'outline',
        points: [
          [0, 0],
          [1, 1],
        ],
      }),
    ],
    [
      'une étiquette sur deux lignes',
      withMark({
        kind: 'fold',
        points: [
          [0, 0],
          [1, 1],
        ],
        label: 'a\nb',
      }),
    ],
    [
      'un exemplaire inconnu',
      withMark({
        kind: 'slit',
        points: [
          [0, 0],
          [1, 1],
        ],
        copy: 'left',
      }),
    ],
    [
      'un galon de largeur nulle',
      withMark({
        kind: 'line',
        points: [
          [0, 0],
          [1, 1],
        ],
        widthMm: 0,
      }),
    ],
    [
      'un champ inconnu sur une marque',
      withMark({ kind: 'button', points: [[0, 0]], color: 'red' }),
    ],
  ])('refuse %s', (_, input) => {
    expect(specErrors(input)).not.toEqual([]);
  });
});

describe('MeasurementSet : mesures de FreeSewing', () => {
  const validate = contractValidator('measurementSet');
  // Valeurs du tableau de tailles de FreeSewing (homme, cou 42), pas celles d'une personne.
  const required = {
    sex: 'male',
    statureMm: 1800,
    chestGirthMm: 1105,
    waistGirthMm: 882,
    hipGirthMm: 1084,
  };
  const freesewing = {
    upperHipGirthMm: 928,
    waistGirthBackMm: 447,
    hipGirthBackMm: 595,
    shoulderSlopeDeg: 13,
    waistToArmpitMm: 224,
    waistToUpperHipMm: 139,
    crotchLengthMm: 925,
    frontCrotchLengthMm: 436,
    waistToThighMm: 363,
    highBustGirthMm: 1138,
    kneeHeightMm: 525,
  };

  it('les onze mesures sont facultatives et acceptées dans leurs bornes', () => {
    expect(Object.keys(freesewing)).toHaveLength(11);
    expect(validate(required).isOk()).toBe(true);
    expect(validate({ ...required, ...freesewing }).isOk()).toBe(true);
  });

  it.each([
    ['une pente d’épaule décimale', { shoulderSlopeDeg: 13.5 }],
    ['une pente d’épaule hors bornes', { shoulderSlopeDeg: 60 }],
    ['une longueur de fourche hors bornes', { crotchLengthMm: 5 }],
    ['une part dos négative', { waistGirthBackMm: -1 }],
    ['un tour de poitrine haute décimal', { highBustGirthMm: 1138.5 }],
    ['une hauteur du genou hors bornes', { kneeHeightMm: 100 }],
  ])('refuse %s', (_, extra) => {
    expect(validate({ ...required, ...extra }).isErr()).toBe(true);
  });
});

import { Brian } from '@freesewing/brian';
import { describe, expect, it } from 'vitest';
import { MODELS } from '../src/adapters/freesewing/models.js';
import type { ModelEntry } from '../src/adapters/freesewing/models.js';
import type { FsDesign, FsPattern } from '../src/adapters/freesewing/types.js';
import { draftEntry } from '../src/draft.js';
import {
  ContourError,
  CoverageError,
  DraftingError,
  EdgeNotFoundError,
  FreeSewingError,
  InvalidMeasurementError,
  InvalidRequestError,
  MissingMeasurementError,
  SeamError,
  SheetError,
  UnknownModelError,
  UnknownSizeError,
  draftModel,
  MODEL_KEYS,
} from '../src/index.js';
import type { DraftRequest, ModelSheet, SizeName } from '../src/index.js';
import type { MeasurementSet } from '@atelier/contracts-ts';
import { measurementSetOf, sexOf, sizeRequest } from './helpers.js';
import { sizeMeasurements } from '../src/adapters/freesewing/sizes.js';

const request = sizeRequest('cisMaleAdult42');

/** Le jeu de mesures de la taille, sans un champ. */
const setWithout = (size: SizeName, field: keyof MeasurementSet): MeasurementSet =>
  Object.fromEntries(
    Object.entries(measurementSetOf(sexOf(size), sizeMeasurements(size))).filter(
      ([key]) => key !== field,
    ),
  ) as unknown as MeasurementSet;

/** Brian, dont le tracé journalise ce que `inject` y met : un modèle de FreeSewing qui se plaint. */
const complaining = (inject: (pattern: FsPattern) => void): ModelEntry => ({
  ...MODELS.brian,
  design: class extends Brian {
    override draft(): FsPattern {
      const pattern = super.draft();
      inject(pattern);
      return pattern;
    }
  },
});

const logs = (pattern: FsPattern) =>
  pattern.setStores[0]?.logs as { error: unknown[]; warn: unknown[] };

const failure = (run: () => unknown): DraftingError => {
  try {
    run();
  } catch (error) {
    expect(error).toBeInstanceOf(DraftingError);
    return error as DraftingError;
  }
  throw new Error('aucune erreur levée');
};

describe('erreurs de la demande', () => {
  it('refuse un modèle inconnu et liste ceux du catalogue', () => {
    const error = failure(() => draftModel({ ...request, model: 'teagan' as never }));
    expect(error).toBeInstanceOf(UnknownModelError);
    expect(error).toMatchObject({ code: 'unknown-model', model: 'teagan', known: MODEL_KEYS });
    expect(error.message).toBe('unknown model "teagan" (known: brian)');
  });

  it.each(['constructor', '__proto__', 'toString', ''])(
    'ne confond pas « %s » avec un modèle',
    (model) => {
      expect(() => draftModel({ ...request, model: model as never })).toThrow(UnknownModelError);
    },
  );

  it.each([
    'cisMaleAdult41',
    'cisMaleAdult042',
    'cisMaleAdult',
    'cisFemaleDoll10',
    'cisMaleGiant150',
    '',
  ])('refuse la taille « %s »', (size) => {
    const error = failure(() =>
      draftModel({ model: 'brian', measurements: { size: size as never } }),
    );
    expect(error).toBeInstanceOf(UnknownSizeError);
    expect(error).toMatchObject({ code: 'unknown-size', size });
  });

  it.each([
    ['ni taille ni jeu', {}],
    ['une taille et un jeu', { size: 'cisMaleAdult42', set: {} }],
    ['aucune mesure', null],
    ['une chaîne', 'cisMaleAdult42'],
  ])('refuse des mesures mal formées : %s', (_name, measurements) => {
    const error = failure(() =>
      draftModel({ model: 'brian', measurements } as unknown as DraftRequest),
    );
    expect(error).toBeInstanceOf(InvalidRequestError);
    expect(error.code).toBe('invalid-request');
  });

  it('refuse un jeu de mesures auquel il manque une mesure exigée, avant de tracer', () => {
    const incomplete = setWithout('cisMaleAdult42', 'shoulderSlopeDeg');
    const error = failure(() => draftModel({ model: 'brian', measurements: { set: incomplete } }));
    expect(error).toBeInstanceOf(MissingMeasurementError);
    expect((error as MissingMeasurementError).missing).toEqual([
      { measurement: 'shoulderSlope', fields: ['shoulderSlopeDeg'] },
    ]);
  });

  it('exige le tour de poitrine haute quand draftForHighBust le demande (FreeSewing l’ignorerait en silence)', () => {
    const set = measurementSetOf('female', sizeMeasurements('cisFemaleAdult34'));
    const withoutHighBust = setWithout('cisFemaleAdult34', 'highBustGirthMm');
    const ok = (options = {}) =>
      draftModel({ model: 'brian', measurements: { set: withoutHighBust }, options });
    expect(ok().parts).toHaveLength(3);
    const error = failure(() => ok({ draftForHighBust: true }));
    expect(error).toBeInstanceOf(MissingMeasurementError);
    expect((error as MissingMeasurementError).missing).toEqual([
      { measurement: 'highBust', fields: ['highBustGirthMm'] },
    ]);
    expect(
      draftModel({ model: 'brian', measurements: { set }, options: { draftForHighBust: true } })
        .parts,
    ).toHaveLength(3);
  });

  it('refuse tout de suite un jeu démesuré, sans lancer FreeSewing (qui y mettrait des secondes, ou plus)', () => {
    const fs = sizeMeasurements('cisMaleAdult42');
    const huge = Object.fromEntries(Object.entries(fs).map(([name, value]) => [name, value * 1e9]));
    const set = { ...measurementSetOf('male', huge), shoulderSlopeDeg: 13 };
    const start = performance.now();
    const error = failure(() => draftModel({ model: 'brian', measurements: { set } }));
    expect(error).toBeInstanceOf(InvalidMeasurementError);
    expect(performance.now() - start).toBeLessThan(500);
  });

  it('refuse une mesure inutilisable', () => {
    const set = {
      ...measurementSetOf('male', sizeMeasurements('cisMaleAdult42')),
      wristGirthMm: -3,
    };
    const error = failure(() => draftModel({ model: 'brian', measurements: { set } }));
    expect(error).toBeInstanceOf(InvalidMeasurementError);
    expect(error).toMatchObject({ code: 'invalid-measurement', field: 'wristGirthMm' });
  });
});

describe('FreeSewing journalise une erreur', () => {
  it('rejette le tracé et reprend le message, au format [texte, erreur] de FreeSewing', () => {
    const entry = complaining((pattern) =>
      logs(pattern).error.push([
        'Unable to draft part `brian.front` (set `0`)',
        new Error('Cannot read properties of undefined'),
      ]),
    );
    const error = failure(() => draftEntry('brian', entry, request));
    expect(error).toBeInstanceOf(FreeSewingError);
    expect(error).toMatchObject({ code: 'freesewing', model: 'brian' });
    expect((error as FreeSewingError).messages).toEqual([
      'Unable to draft part `brian.front` (set `0`) | Error: Cannot read properties of undefined',
    ]);
    expect(error.message).toContain('FreeSewing logged 1 error(s) for brian');
  });

  it('rejette aussi une erreur du magasin du tracé, un drapeau d’erreur, et regroupe sans doublon', () => {
    const entry = complaining((pattern) => {
      (pattern.store.logs.error as unknown[]).push('first', 'second');
      logs(pattern).error.push('first');
      Object.assign(pattern.setStores[0] ?? {}, {
        plugins: { 'plugin-annotations': { flags: { error: { 'brian:broken.t': {} } } } },
      });
    });
    const error = failure(() => draftEntry('brian', entry, request));
    expect((error as FreeSewingError).messages).toEqual([
      'first',
      'second',
      'flag error brian:broken.t',
    ]);
  });

  it('borne la longueur d’un message verbeux', () => {
    const entry = complaining((pattern) => logs(pattern).error.push('x'.repeat(5000)));
    const [message] = (failure(() => draftEntry('brian', entry, request)) as FreeSewingError)
      .messages;
    expect(message?.length).toBeLessThan(400);
  });

  it('rejette une exception levée par FreeSewing', () => {
    const exploding = Object.assign(
      function exploding() {
        throw new TypeError('measurements is undefined');
      },
      { patternConfig: Brian.patternConfig },
    ) as unknown as FsDesign;
    const error = failure(() =>
      draftEntry('brian', { ...MODELS.brian, design: exploding }, request),
    );
    expect(error).toBeInstanceOf(FreeSewingError);
    expect((error as FreeSewingError).messages).toEqual(['TypeError: measurements is undefined']);
  });

  it('rend les avertissements sans rejeter le tracé', () => {
    const entry = complaining((pattern) => {
      logs(pattern).warn.push('careful', ['two', 'parts']);
      Object.assign(pattern.setStores[0] ?? {}, {
        plugins: { 'plugin-annotations': { flags: { warn: { 'brian:careful.t': {} } } } },
      });
    });
    expect(draftEntry('brian', entry, request).warnings).toEqual([
      'careful',
      'two | parts',
      'flag warn brian:careful.t',
    ]);
  });

  it('rejette une pièce que FreeSewing n’a pas tracée, même sans erreur au journal', () => {
    const entry = complaining((pattern) => {
      delete (pattern.parts[0] as Record<string, unknown>)['brian.front'];
    });
    const error = failure(() => draftEntry('brian', entry, request));
    expect(error).toBeInstanceOf(ContourError);
    expect(error).toMatchObject({ code: 'invalid-contour', part: 'brian.front' });
  });
});

describe('fiche de couture en défaut', () => {
  const withSheet = (sheet: ModelSheet): ModelEntry => ({ ...MODELS.brian, sheet });
  const [front, back, sleeve] = MODELS.brian.sheet.parts;
  const frontEdges = front?.edges ?? [];

  it('rejette un bord de la fiche introuvable, en nommant la pièce, le bord et le point', () => {
    const edges = frontEdges.map((edge) =>
      edge.id === 'shoulder' ? { ...edge, to: 'noSuchPoint' } : edge,
    );
    const sheet = {
      ...MODELS.brian.sheet,
      parts: [{ ...(front as NonNullable<typeof front>), edges }, back, sleeve],
    } as ModelSheet;
    const error = failure(() => draftEntry('brian', withSheet(sheet), request));
    expect(error).toBeInstanceOf(EdgeNotFoundError);
    expect(error).toMatchObject({ code: 'edge-not-found', part: 'brian.front', edge: 'shoulder' });
    expect(error.message).toBe(
      'part brian.front, edge "shoulder": point "noSuchPoint" does not exist in the part',
    );
  });

  it('rejette un bord dont un point n’est pas un sommet du contour', () => {
    // `cfWaist` existe, sur le bord du milieu devant, sans être un sommet.
    const edges = frontEdges.map((edge) =>
      edge.id === 'hem' ? { ...edge, from: 'cfWaist' } : edge,
    );
    const sheet = {
      ...MODELS.brian.sheet,
      parts: [{ ...(front as NonNullable<typeof front>), edges }, back, sleeve],
    } as ModelSheet;
    const error = failure(() => draftEntry('brian', withSheet(sheet), request));
    expect(error).toBeInstanceOf(EdgeNotFoundError);
    expect(error.message).toContain('point "cfWaist" is not a vertex of the seam contour');
  });

  it('rejette un contour que la fiche ne couvre pas entièrement', () => {
    const edges = frontEdges.filter((edge) => edge.id !== 'neckline');
    const sheet = {
      ...MODELS.brian.sheet,
      parts: [{ ...(front as NonNullable<typeof front>), edges }, back, sleeve],
    } as ModelSheet;
    const error = failure(() => draftEntry('brian', withSheet(sheet), request));
    expect(error).toBeInstanceOf(CoverageError);
    expect(error).toMatchObject({ code: 'coverage', part: 'brian.front', overlapping: [] });
    expect((error as CoverageError).uncovered).toHaveLength(1);
  });

  it('rejette une pièce masquée de la fiche (le squelette brian.base)', () => {
    const base = { ...(front as NonNullable<typeof front>), part: 'brian.base', id: 'base' };
    const sheet = { ...MODELS.brian.sheet, parts: [base] };
    const error = failure(() => draftEntry('brian', withSheet(sheet), request));
    expect(error).toBeInstanceOf(ContourError);
    expect(error.message).toContain('part brian.base: the part was not drafted');
  });
});

describe('erreurs typées', () => {
  it('portent un code, un nom de classe fixe et héritent de DraftingError', () => {
    const errors = [
      new UnknownModelError('x', ['brian']),
      new UnknownSizeError('x'),
      new InvalidRequestError('x'),
      new InvalidMeasurementError('chestGirthMm', 'must be positive'),
      new MissingMeasurementError('brian', [{ measurement: 'neck', fields: ['neckGirthMm'] }]),
      new FreeSewingError('brian', ['x']),
      new ContourError('brian.front', 'x'),
      new EdgeNotFoundError('brian.front', 'side', 'x'),
      new CoverageError('brian.front', [1], []),
      new SheetError('part front', 'x'),
      new SeamError('armhole', 'x'),
    ];
    for (const error of errors) {
      expect(error).toBeInstanceOf(DraftingError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe(error.constructor.name);
      expect(error.code).toMatch(/^[a-z]+(-[a-z]+)*$/);
    }
    expect(new Set(errors.map((error) => error.code)).size).toBe(errors.length);
  });
});

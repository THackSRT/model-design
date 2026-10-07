import { describe, expect, it } from 'vitest';
import { MODELS } from '../src/adapters/freesewing/models.js';
import type { ModelEntry } from '../src/adapters/freesewing/models.js';
import { draftEntry } from '../src/draft.js';
import { SheetError } from '../src/index.js';
import type { DraftingError, ModelSheet } from '../src/index.js';
import { sizeRequest } from './helpers.js';

const request = sizeRequest('cisMaleAdult42');
const withSheet = (sheet: ModelSheet): ModelEntry => ({ ...MODELS.brian, sheet });

const failure = (run: () => unknown): DraftingError => {
  try {
    run();
  } catch (error) {
    return error as DraftingError;
  }
  throw new Error('aucune erreur levée');
};

describe('fiche de couture en défaut : ce que le tracé lit dans FreeSewing', () => {
  it('rejette une valeur du magasin de FreeSewing que la fiche déclare et que FreeSewing ne rend pas', () => {
    const seams = MODELS.brian.sheet.seams.map((seam) =>
      seam.id === 'armhole' ? { ...seam, ease: { store: 'library.sleeve.noSuchValue' } } : seam,
    );
    const error = failure(() =>
      draftEntry('brian', withSheet({ ...MODELS.brian.sheet, seams }), request),
    );
    expect(error).toBeInstanceOf(SheetError);
    expect(error).toMatchObject({ code: 'invalid-sheet', subject: 'model brian' });
    expect(error.message).toBe(
      'sheet model brian: FreeSewing store value "library.sleeve.noSuchValue" is absent or not a number',
    );
  });

  it('rejette un repère dont un point n’existe pas dans la pièce tracée, en nommant la pièce et le point', () => {
    const frame = { axis: 'noSuchPoint', top: 'hps' };
    const parts = MODELS.brian.sheet.parts.map((part) =>
      part.id === 'front' ? { ...part, frame } : part,
    );
    const error = failure(() =>
      draftEntry('brian', withSheet({ ...MODELS.brian.sheet, parts }), request),
    );
    expect(error).toBeInstanceOf(SheetError);
    expect(error.message).toBe(
      'sheet part front: frame point "noSuchPoint" does not exist in the part',
    );
  });
});

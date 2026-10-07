import { describe, expect, it } from 'vitest';
import * as browserEntry from '../src/index.js';
import * as nodeEntry from '../src/node.js';

describe('entrées du moteur', () => {
  it('l’entrée node rend exactement l’API de l’entrée .', () => {
    expect(Object.keys(nodeEntry).sort()).toEqual(Object.keys(browserEntry).sort());
    for (const [name, value] of Object.entries(browserEntry)) {
      expect((nodeEntry as Record<string, unknown>)[name]).toBe(value);
    }
  });

  it('expose le tracé, la description des modèles, les tailles, les erreurs typées et les versions', () => {
    expect(Object.keys(browserEntry)).toEqual(
      expect.arrayContaining([
        'draftModel',
        'toGarmentSpec',
        'describeModel',
        'MODEL_KEYS',
        'SIZE_NAMES',
        'toFreeSewingMeasurements',
        'ENGINE_VERSION',
        'FREESEWING_VERSION',
        'DraftingError',
        'EdgeNotFoundError',
        'FreeSewingError',
        'MissingMeasurementError',
        'SeamError',
        'SheetError',
      ]),
    );
  });

  it('a Brian pour seul modèle, et dix tailles de femme et dix d’homme', () => {
    expect(browserEntry.MODEL_KEYS).toEqual(['brian']);
    expect(browserEntry.SIZE_NAMES).toHaveLength(20);
    expect(browserEntry.SIZE_NAMES).toContain('cisFemaleAdult28');
    expect(browserEntry.SIZE_NAMES).toContain('cisMaleAdult50');
    expect(
      browserEntry.SIZE_NAMES.filter((name) => name.startsWith('cisFemaleAdult')),
    ).toHaveLength(10);
  });

  it('décrit Brian : mesures, pièces et options réglables', () => {
    const brian = browserEntry.describeModel('brian');
    expect(brian.key).toBe('brian');
    expect(brian.measurements).toContain('shoulderSlope');
    expect(brian.optionalMeasurements).toEqual(['highBust']);
    expect(brian.parts).toEqual(['brian.front', 'brian.back', 'library.sleeve']);
    expect(brian.options.map((option) => option.name)).toContain('chestEase');
  });
});

import { describe, expect, it } from 'vitest';
import {
  benchErrorMessage,
  importErrorMessage,
  noticeMessage,
  paramUnit,
  presetName,
  quantity,
} from '../src/i18n/bench.js';
import { readFileText } from '../src/platform/read-file.js';
import { stepFor, visibleReadings } from '../src/screens/fabric-bench/series.js';

describe('lectures d’une série', () => {
  it('propose une lecture vide après la dernière saisie, dans la limite du contrat', () => {
    expect(visibleReadings({}, 'thickness.readingsMm', 32)).toBe(1);
    expect(visibleReadings({ 'thickness.readingsMm.0': 0.2 }, 'thickness.readingsMm', 32)).toBe(2);
    expect(visibleReadings({ 'thickness.readingsMm.2': 0.2 }, 'thickness.readingsMm', 32)).toBe(4);
    expect(visibleReadings({ 'thickness.readingsMm.1': 0.2 }, 'thickness.readingsMm', 2)).toBe(2);
  });

  it('choisit un pas selon l’ordre de grandeur', () => {
    expect([stepFor(10), stepFor(75), stepFor(1000), stepFor(undefined)]).toEqual([
      0.01, 0.1, 1, 0.01,
    ]);
  });
});

describe('traductions du banc d’essai', () => {
  it('unité d’un champ lue dans le suffixe de son nom', () => {
    expect(
      ['sampleMassG', 'sampleAreaMm2', 'readingsMm', 'slideAnglesDeg', 'drapeCoefficient'].map(
        paramUnit,
      ),
    ).toEqual(['g', 'mm²', 'mm', '°', '']);
  });

  it('valeur avec unité, sans espace en trop pour une grandeur sans unité', () => {
    expect(quantity('weightGPerM2', 120)).toBe('120 g/m²');
    expect(quantity('frictionCoefficient', 0.35)).toBe('0,35');
  });

  it('un nom inconnu du catalogue reste tel quel', () => {
    expect(presetName('jersey')).toBe('Jersey');
    expect(presetName('toString')).toBe('toString');
  });

  it('erreurs de saisie, d’import et avis', () => {
    expect(benchErrorMessage({ code: 'range', min: 5, max: 500 }, 'mm')).toMatch(
      /Entre 5 et 500 mm/,
    );
    expect(benchErrorMessage({ code: 'required' }, 'mm')).toBe('Valeur obligatoire');
    expect(importErrorMessage({ code: 'too-large', maxBytes: 262_144 })).toMatch(/256 Kio/);
    expect(importErrorMessage({ code: 'invalid', path: 'reviews.0', keyword: 'required' })).toMatch(
      /reviews\.0.*required/,
    );
    expect(importErrorMessage({ code: 'duplicate-preset', preset: 'denim' })).toMatch(/Denim/);
    expect(importErrorMessage({ code: 'unsupported-version' })).toMatch(/version/);
    expect(noticeMessage({ code: 'simulations-dropped', engineVersion: '9.9.9' })).toMatch(
      /9\.9\.9/,
    );
    expect(noticeMessage({ code: 'estimate-changed', preset: 'linen' })).toMatch(/^Lin :/);
  });
});

describe('lecture d’un fichier choisi', () => {
  it('ne lit pas plus que la limite, un octet de plus signalant le dépassement', async () => {
    const file = new File(['abcdefghij'], 'r.json');
    expect(await readFileText(file, 4)).toBe('abcde');
    expect(await readFileText(file, 100)).toBe('abcdefghij');
  });
});

import { compareToEstimate, FABRIC_PRESETS } from '@atelier/drape';
import { describe, expect, it } from 'vitest';
import { suggestVerdict } from '../src/fabric-bench/verdict.js';

const poplin = FABRIC_PRESETS['cotton-poplin'];
const within = compareToEstimate(poplin, { weightGPerM2: 125, thicknessMm: 0.21 });
const outside = compareToEstimate(poplin, { weightGPerM2: 200 });

describe('suggestVerdict', () => {
  it('aucune mesure : à reprendre', () => {
    expect(suggestVerdict([], {})).toBe('to-review');
  });

  it('un coefficient de drapé mesuré sans essai simulé ne compte pas', () => {
    expect(suggestVerdict([], { measured: 0.5 })).toBe('to-review');
  });

  it('toutes les grandeurs dans la tolérance : validé', () => {
    expect(suggestVerdict(within, {})).toBe('validated');
  });

  it('une grandeur hors tolérance : corrigé', () => {
    expect(suggestVerdict([...within, ...outside], {})).toBe('corrected');
  });

  it('le coefficient de drapé hors tolérance : corrigé ; dedans : validé', () => {
    expect(suggestVerdict(within, { measured: 0.4, simulatedEstimated: 0.5 })).toBe('corrected');
    expect(suggestVerdict(within, { measured: 0.52, simulatedEstimated: 0.5 })).toBe('validated');
  });

  it('un coefficient de drapé conforme seul suffit à valider', () => {
    expect(suggestVerdict([], { measured: 0.5, simulatedEstimated: 0.5 })).toBe('validated');
  });
});

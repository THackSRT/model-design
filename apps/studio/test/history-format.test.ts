import { GARMENT_PARAM_KEYS, MEASUREMENT_SET_KEYS } from '@atelier/features';
import { describe, expect, it } from 'vitest';
import { t } from '../src/i18n/t.js';
import {
  defaultSelection,
  measurementChangeLabel,
  measurementChangeText,
  paramChangeLabel,
  paramChangeText,
  summaryParams,
} from '../src/screens/pattern-studio/history-format.js';

const plain = (text: string) => text.replace(/\s/g, ' ');

describe('formats de l’historique', () => {
  it('paramètre en mm : affiché en cm avec son libellé', () => {
    expect(plain(paramChangeText('straight-skirt', { path: 'lengthMm', from: 600, to: 650 }))).toBe(
      'Longueur : 60 cm → 65 cm',
    );
  });

  it('paramètre des manches, sans unité et absent', () => {
    expect(plain(paramChangeText('bodice', { path: 'sleeve.capEaseMm', to: 25 }))).toBe(
      'Embu de la tête de manche : absent → 2,5 cm',
    );
    expect(
      plain(paramChangeText('circle-skirt', { path: 'circleFraction', from: 0.5, to: 1 })),
    ).toBe('Fraction de cercle : 0,5 → 1');
  });

  it('mesure : libellé connu, repli sur le nom, morphologie traduite', () => {
    expect(plain(measurementChangeText({ name: 'waistGirthMm', from: 700, to: 720 }))).toBe(
      'Tour de taille : 70 cm → 72 cm',
    );
    expect(plain(measurementChangeText({ name: 'kneeGirthMm', from: 380, to: 390 }))).toBe(
      'Tour de genou : 38 cm → 39 cm',
    );
    expect(plain(measurementChangeText({ name: 'sex', from: 'female', to: 'male' }))).toBe(
      'Morphologie : Femme → Homme',
    );
  });

  it('résumé : seulement les longueurs du vêtement', () => {
    const params = summaryParams({
      number: 1,
      createdAt: '2026-09-30T10:00:00.000Z',
      fingerprint: 'a'.repeat(64),
      engineVersion: '0.1.0',
      garment: { type: 'circle-skirt', params: { lengthMm: 600, circleFraction: 1 } },
    });
    expect(params).toEqual([{ path: 'lengthMm', label: 'Longueur', valueMm: 600 }]);
  });

  it('sélection par défaut : la précédente et la courante', () => {
    const versions = [{ number: 5 }, { number: 4 }, { number: 3 }];
    expect(defaultSelection(versions, 5)).toEqual({ from: 4, to: 5 });
    expect(defaultSelection(versions, 4)).toEqual({ from: 3, to: 4 });
    expect(defaultSelection(versions, undefined)).toEqual({ from: 4, to: 5 });
    expect(defaultSelection([{ number: 1 }], 1)).toEqual({ from: 1, to: 1 });
    expect(defaultSelection([], 1)).toBeUndefined();
  });

  it('chaque mesure et chaque paramètre du contrat a son libellé ; une clé inconnue reste générique', () => {
    for (const name of MEASUREMENT_SET_KEYS) {
      expect(measurementChangeLabel(name), name).not.toBe(t('measurements.other'));
    }
    for (const [type, params] of Object.entries(GARMENT_PARAM_KEYS)) {
      for (const path of params) {
        const isSleeve = type === 'sleeve';
        const label = paramChangeLabel(
          isSleeve ? 'bodice' : type,
          isSleeve ? `sleeve.${path}` : path,
        );
        expect(label, `${type}.${path}`).not.toBe(t('param.other'));
      }
    }
    expect(measurementChangeLabel('futureGirthMm')).toBe('Autre mesure');
    expect(paramChangeLabel('trousers', 'futureMm')).toBe('Autre paramètre');
  });
});

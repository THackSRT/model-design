import { DRAFTED_GARMENT_TYPES, GARMENT_TYPES, garmentFields } from '@atelier/features';
import { describe, expect, it } from 'vitest';
import { fr } from '../src/i18n/fr.js';
import {
  fieldErrorMessage,
  formatMessage,
  garmentName,
  paramLabel,
  problemMessage,
  t,
} from '../src/i18n/t.js';

describe('traduction ICU', () => {
  it('accorde le pluriel des pièces', () => {
    expect(t('pattern.pieces', { count: 0 })).toBe('Aucune pièce');
    expect(t('pattern.pieces', { count: 1 })).toBe('1 pièce');
    expect(t('pattern.pieces', { count: 3 })).toBe('3 pièces');
  });

  it('formate un nombre en mm à la française', () => {
    expect(t('measurements.value', { valueMm: 1234.5 })).toBe('1 234,5 mm');
  });

  it('gère la sélection (genre) et les paramètres simples', () => {
    const pattern = '{sex, select, female {Elle} male {Lui} other {Iel}}';
    expect(formatMessage(pattern, { sex: 'female' })).toBe('Elle');
    expect(formatMessage(pattern, { sex: 'male' })).toBe('Lui');
    expect(formatMessage(pattern, { sex: 'x' })).toBe('Iel');
    expect(t('pattern.version', { number: 3 })).toBe('Version 3');
  });

  it('traduit un problème connu et retombe sur le message par défaut', () => {
    expect(problemMessage('/problems/network')).toBe(fr['problem./problems/network']);
    expect(problemMessage('/problems/inconnu')).toBe(fr['problem.default']);
  });

  it('refuse une clé inconnue au typage', () => {
    // @ts-expect-error clé absente du catalogue
    const call = () => t('cle.inconnue');
    expect(call).toBeTypeOf('function');
  });
});

describe('erreurs de saisie', () => {
  const range = { code: 'range', minMm: 600, maxMm: 1900 } as const;
  it('affiche les bornes dans l’unité du champ', () => {
    expect(fieldErrorMessage(range, 'cm')).toBe('Entre 60 cm et 190 cm');
    expect(fieldErrorMessage(range, 'mm')).toBe('Entre 600 mm et 1 900 mm');
    expect(fieldErrorMessage({ code: 'required' }, 'cm')).toBe('Valeur obligatoire');
  });
});

describe('catalogue des vêtements', () => {
  it('chaque type du contrat et chaque champ d’un type tracé ont leur clé', () => {
    for (const type of GARMENT_TYPES) expect(`garment.${type}` in fr).toBe(true);
    for (const type of DRAFTED_GARMENT_TYPES) {
      for (const { param } of garmentFields(type)) {
        expect(`param.${type}.${param}` in fr).toBe(true);
        expect(paramLabel(type, param)).not.toBe(param);
      }
    }
  });

  it('un type inconnu du studio garde son identifiant', () => {
    expect(garmentName('coat')).toBe('coat');
    expect(garmentName('trousers')).toBe('Pantalon');
  });

  it('nouveaux codes d’erreur', () => {
    expect(fieldErrorMessage({ code: 'zeroOrRange', minMm: 20, maxMm: 80 }, 'cm')).toBe(
      '0 ou entre 2 cm et 8 cm',
    );
    expect(fieldErrorMessage({ code: 'ratioRange', min: 0.25, max: 1 }, 'cm')).toBe(
      'Entre 0,25 et 1',
    );
  });
});

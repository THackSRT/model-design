import { describe, expect, it } from 'vitest';
import { fr } from '../src/i18n/fr.js';
import { formatMessage, problemMessage, t } from '../src/i18n/t.js';

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

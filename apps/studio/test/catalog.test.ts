import { describe, expect, it } from 'vitest';
import { frBench } from '../src/i18n/fr-bench.js';
import { fr } from '../src/i18n/fr.js';
import { hasMessage, t, translate } from '../src/i18n/t.js';

describe('catalogue du banc, chargé avec l’écran', () => {
  it('garde les clés de l’onglet dans l’entrée et le banc dehors', () => {
    expect(t('tabs.fabrics')).toBe('Tissus');
    expect(t('fabricBench.loading')).toBe('Chargement du banc d’essai…');
    expect(Object.keys(fr).some((key) => key in frBench)).toBe(false);
  });

  it('ne montre jamais une clé brute : le texte du banc manque tant que l’écran n’est pas chargé', async () => {
    expect(() => translate('fabricBench.title', undefined, true)).toThrow(/fabricBench\.title/);
    const { tBench } = await import('../src/i18n/bench.js');
    expect(tBench('fabricBench.title')).toBe('Banc d’essai des tissus');
  });

  it('chaque clé du banc est enregistrée avec l’écran', async () => {
    await import('../src/i18n/bench.js');
    for (const key of Object.keys(frBench)) expect(hasMessage(key)).toBe(true);
  });
});

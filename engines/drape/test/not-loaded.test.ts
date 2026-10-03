import { describe, expect, it } from 'vitest';
import { buildBody } from '../src/node.js';
import { MEASUREMENTS } from './drape-helpers.js';

// Fichier à part : le moteur mannequin n'y est jamais chargé (chaque fichier de test a son propre module).
describe('avatar sans moteur chargé', () => {
  it('lance une erreur claire, sans mesure dans le message', () => {
    let message = '';
    try {
      buildBody(MEASUREMENTS, {});
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toMatch(/not loaded/);
    expect(message).not.toMatch(/1650|640|960/);
  });
});

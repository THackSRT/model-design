import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  GARMENTS,
  holds,
  marginOf,
  marginTable,
  measureGarment,
  type Measured,
} from './garment-criteria.js';

// Les cinq vêtements de référence en qualité standard (ADR 0013, « Standard »), un drapé chacun, partagé par ses
// critères. Cible à part (`test-standard`) : hors `pnpm check`, car chaque drapé dure de quelques secondes à une minute.
// Les marges de chaque critère sont affichées en fin de vêtement.

describe.each(GARMENTS)('%s en standard', (name) => {
  let measured: Measured;

  beforeAll(async () => {
    measured = await measureGarment(name, 'standard');
  });

  afterAll(() => {
    console.log(marginTable(measured));
  });

  it('tient tous ses critères, temps réel d’un drapé compris', () => {
    const failed = measured.criteria.filter((c) => !holds(c));
    expect(
      failed.map((c) => `${c.id} : ${c.value} (marge ${marginOf(c)})`),
      measured.problem,
    ).toEqual([]);
  });
});

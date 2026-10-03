import { CUSICK_SPECIMEN_DIAMETER_MM, ENGINE_VERSION, FABRIC_PRESETS } from '@atelier/drape';
import { describe, expect, it } from 'vitest';
import { handleCusickRequest } from '../src/platform/cusick-protocol.js';

const POPLIN = FABRIC_PRESETS['cotton-poplin'];
// Maillage grossier et peu de pas : le vrai moteur, en une fraction de seconde.
const FAST = { edgeMm: 15, maxSteps: 40 } as const;

describe('traitement d’un essai de Cusick (worker)', () => {
  it('rend le coefficient, la version du moteur et le contour, transféré sans copie', () => {
    const { response, transfer } = handleCusickRequest({ id: 3, fabric: POPLIN, ...FAST });
    expect(response.ok).toBe(true);
    if (!response.ok) return;
    expect(response.id).toBe(3);
    expect(response.result.drapeCoefficient).toBeGreaterThanOrEqual(0);
    expect(response.result.drapeCoefficient).toBeLessThanOrEqual(1);
    expect(response.result.engineVersion).toBe(ENGINE_VERSION);
    expect(response.result.simulatedSteps).toBeGreaterThan(0);
    expect(typeof response.result.converged).toBe('boolean');
    expect(response.outlineMm).toBeInstanceOf(Float64Array);
    expect(response.outlineMm.length).toBeGreaterThan(0);
    expect(response.outlineMm.length % 2).toBe(0);
    for (const value of response.outlineMm) {
      expect(Math.abs(value)).toBeLessThanOrEqual(CUSICK_SPECIMEN_DIAMETER_MM / 2 + 1);
    }
    expect(transfer).toEqual([response.outlineMm.buffer]);
  });

  it('rend une erreur sans tampon pour une entrée refusée par le moteur', () => {
    const { response, transfer } = handleCusickRequest({
      id: 4,
      fabric: POPLIN,
      edgeMm: 15,
      maxSteps: -1,
    });
    expect(response).toMatchObject({ id: 4, ok: false });
    expect(response.ok === false && response.message.length).toBeGreaterThan(0);
    expect(transfer).toEqual([]);
  });
});

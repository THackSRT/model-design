import { describe, expect, it } from 'vitest';
import { MODELS } from '../src/adapters/freesewing/models.js';
import { storeKeysOf } from '../src/core/sheet.js';
import type { ModelSheet, PartSheet } from '../src/core/sheet.js';
import { MODEL_KEYS, describeModel, draftModel } from '../src/index.js';
import { sizeRequest } from './helpers.js';

/** Une pièce de la fiche par son identifiant : erreur si elle n'y est pas. */
function partOf(sheet: ModelSheet, id: string): PartSheet {
  const part = sheet.parts.find((candidate) => candidate.id === id);
  if (part === undefined) throw new Error(`pièce ${id} absente de la fiche`);
  return part;
}

describe.each(MODEL_KEYS)('fiche de couture de %s : cohérence de la fiche seule', (key) => {
  const { sheet } = MODELS[key];

  it('nomme chaque pièce, chaque bord et chaque couture une seule fois, et décrit les pièces que le modèle trace', () => {
    expect(new Set(sheet.parts.map((part) => part.id)).size).toBe(sheet.parts.length);
    expect(new Set(sheet.parts.map((part) => part.part)).size).toBe(sheet.parts.length);
    for (const part of sheet.parts) {
      expect(new Set(part.edges.map((edge) => edge.id)).size, part.id).toBe(part.edges.length);
    }
    expect(new Set(sheet.seams.map((seam) => seam.id)).size).toBe(sheet.seams.length);
    expect(describeModel(key).parts).toEqual(sheet.parts.map((part) => part.part));
  });

  it('déclare un seul bord de pli aux pièces coupées au pli, et aucun aux autres', () => {
    for (const part of sheet.parts) {
      const folds = part.edges.filter((edge) => edge.role === 'fold');
      expect(folds, part.id).toHaveLength(part.panel.cutOnFold ? 1 : 0);
    }
  });

  it('ne cite, dans ses coutures et ses crans, que des pièces et des bords qu’elle décrit ; un bord dans une couture au plus', () => {
    const sewn = new Set<string>();
    for (const seam of sheet.seams) {
      for (const end of [...seam.a, ...seam.b]) {
        expect(
          partOf(sheet, end.part).edges.some((edge) => edge.id === end.edge),
          `${seam.id}: ${end.part}#${end.edge}`,
        ).toBe(true);
        expect(
          sewn.has(`${end.part}#${end.edge}`),
          `${seam.id}: ${end.part}#${end.edge} cousu deux fois`,
        ).toBe(false);
        sewn.add(`${end.part}#${end.edge}`);
      }
    }
    for (const part of sheet.parts) {
      for (const notch of part.panel.notches ?? []) {
        expect(
          part.edges.some((edge) => edge.id === notch.edge),
          `${part.id}: cran sur ${notch.edge}`,
        ).toBe(true);
        expect([1, 2, 3]).toContain(notch.count ?? 1);
      }
    }
  });

  it('donne à la pose, à la coupe et au droit fil des valeurs que le contrat admet', () => {
    for (const { id, panel } of sheet.parts) {
      expect(Number.isInteger(panel.quantity) && panel.quantity >= 1, `${id}: quantité`).toBe(true);
      expect(panel.placement.clearanceMm, `${id}: écart au corps`).toBeGreaterThanOrEqual(5);
      expect(panel.placement.clearanceMm).toBeLessThanOrEqual(150);
      expect(
        Math.abs(panel.placement.offsetMm),
        `${id}: décalage de l’ancrage`,
      ).toBeLessThanOrEqual(500);
      for (const fraction of Object.values(panel.grain ?? {})) {
        expect(fraction >= 0 && fraction <= 1, `${id}: droit fil`).toBe(true);
      }
    }
  });

  it('écrit pour chaque couture une tolérance positive, et un embu déclaré de la forme prévue', () => {
    for (const seam of sheet.seams) {
      expect(seam.toleranceMm, seam.id).toBeGreaterThan(0);
      expect(['same', 'opposite']).toContain(seam.align);
      if (seam.ease !== undefined) {
        const keys = Object.keys(seam.ease);
        expect(
          keys.length === 1 && (keys[0] === 'mm' || keys[0] === 'store'),
          `${seam.id}: embu`,
        ).toBe(true);
      }
    }
  });

  it('lit dans FreeSewing les valeurs qu’elle déclare : le tracé les rapporte toutes, et elles seules', () => {
    const draft = draftModel({ ...sizeRequest('cisMaleAdult42'), model: key });
    expect(Object.keys(draft.values).sort()).toEqual(storeKeysOf(sheet).sort());
    for (const value of Object.values(draft.values)) expect(Number.isFinite(value)).toBe(true);
  });
});

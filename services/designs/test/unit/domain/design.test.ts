import { describe, expect, it } from 'vitest';
import { createDesign } from '../../../src/domain/design.js';
import { addVersion } from '../../../src/domain/design-version.js';
import { canonicalJson } from '../../../src/domain/fingerprint.js';
import { aDesign, aSkirt, aSpec, NOW, ORG, someMeasurements } from '../../builders.js';

const newDesign = (name: string) =>
  createDesign({
    id: aDesign().id,
    organizationId: ORG,
    name,
    garmentType: 'straight-skirt',
    now: new Date(NOW),
  });

describe('un modèle', () => {
  it('se crée sans version, avec un nom nettoyé', () => {
    const design = newDesign('  Jupe droite  ');
    expect(design.isOk() && design.value).toMatchObject({
      name: 'Jupe droite',
      latestVersionNumber: 0,
    });
  });

  it('refuse un nom vide ou trop long', () => {
    expect(newDesign('   ').isErr()).toBe(true);
    expect(newDesign('x'.repeat(121)).isErr()).toBe(true);
  });
});

describe('une nouvelle version', () => {
  const draft = {
    measurements: someMeasurements(),
    garment: aSkirt(),
    spec: aSpec(),
    fingerprint: 'f'.repeat(64),
    now: new Date(NOW),
  };

  it('prend le numéro suivant et annonce design.versioned', () => {
    const added = addVersion(aDesign({ latestVersionNumber: 2 }), draft);
    if (added.isErr()) throw new Error(added.error.detail);
    expect(added.value.version.number).toBe(3);
    expect(added.value.design.latestVersionNumber).toBe(3);
    expect(added.value.events).toEqual([
      expect.objectContaining({
        type: 'design.versioned',
        data: expect.objectContaining({ versionNumber: 3 }),
      }),
    ]);
  });

  it('refuse un patron d’un autre type de vêtement', () => {
    const added = addVersion(aDesign(), { ...draft, spec: aSpec('shirt') });
    expect(added.isErr() && added.error.kind).toBe('garment-type-mismatch');
  });
});

describe('la forme canonique', () => {
  it('ne dépend pas de l’ordre des champs', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 3 }] })).toBe(
      canonicalJson({ a: [{ c: 3, d: 2 }], b: 1 }),
    );
  });
});

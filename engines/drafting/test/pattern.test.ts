import { describe, expect, it } from 'vitest';
import { SeamError, SheetError } from '../src/core/errors.js';
import { assemblePattern } from '../src/core/pattern.js';
import type { Pattern, PatternEdge } from '../src/core/pattern-types.js';
import { structuralRoleOf } from '../src/core/sheet.js';
import type { ModelSheet } from '../src/core/sheet.js';
import { demoParts, demoSheet } from './demo-garment.js';
import { lengthOfEdge } from './spec-helpers.js';

const piece = (edge: PatternEdge) =>
  edge.piece.kind === 'curve'
    ? {
        id: edge.id,
        from: [edge.piece.p0.xMm, edge.piece.p0.yMm],
        to: [edge.piece.p1.xMm, edge.piece.p1.yMm],
        controls: [
          [edge.piece.c1.xMm, edge.piece.c1.yMm],
          [edge.piece.c2.xMm, edge.piece.c2.yMm],
        ],
      }
    : {
        id: edge.id,
        from: [edge.piece.p0.xMm, edge.piece.p0.yMm],
        to: [edge.piece.p1.xMm, edge.piece.p1.yMm],
      };

/** Longueur d'un bord de patron, mesurée sur sa polyligne échantillonnée. */
const lengthOf = (edge: PatternEdge): number =>
  lengthOfEdge(piece(edge) as Parameters<typeof lengthOfEdge>[0]);

const panelOf = (pattern: Pattern, id: string) =>
  pattern.panels.find((panel) => panel.id === id) as Pattern['panels'][number];

/** Embu mesuré du vêtement de démonstration : tête de manche moins les deux emmanchures. */
function measuredEase(): number {
  const sheet = demoSheet(0, 1000);
  const pattern = assemblePattern(sheet, demoParts(sheet), {});
  const sum = (id: string, role: string) =>
    panelOf(pattern, id)
      .edges.filter((e) => e.semanticRole === role)
      .reduce((total, edge) => total + lengthOf(edge), 0);
  return sum('sleeve', 'sleeveCap') - sum('front', 'armhole') - sum('back', 'armhole');
}

describe('assemblePattern : la fiche pilote la conversion (vêtement de démonstration, sans FreeSewing)', () => {
  const ease = Math.round(measuredEase() * 1000) / 1000;
  const sheet = demoSheet(ease);
  const pattern = assemblePattern(sheet, demoParts(sheet), {});

  it('part d’un embu mesuré qui en est un : la tête est plus longue que les deux emmanchures', () => {
    expect(ease).toBeGreaterThan(2);
  });

  it('rend les pièces dans l’ordre de la fiche, avec ce qu’elle déclare', () => {
    expect(pattern.garmentType).toBe('demo');
    expect(pattern.panels.map((p) => [p.id, p.quantity, p.cutOnFold])).toEqual([
      ['front', 1, true],
      ['back', 1, true],
      ['sleeve', 2, false],
    ]);
    expect(panelOf(pattern, 'sleeve').placement).toMatchObject({
      zone: 'arm',
      landmark: 'shoulder',
      anchorMm: { xMm: 0, yMm: 0 },
    });
  });

  it('met chaque pièce dans son repère : origine au point `top`, axe sur `axis`, y vers le haut', () => {
    const front = panelOf(pattern, 'front').edges;
    expect(front[0]?.piece.p0).toEqual({ xMm: 0, yMm: -0 });
    expect(front[0]?.piece.p1).toEqual({ xMm: 0, yMm: -200 });
    const sleeve = panelOf(pattern, 'sleeve').edges;
    const cap = sleeve.filter((e) => e.semanticRole === 'sleeveCap');
    // Le sommet `t` de la manche (10, −88) devient l'origine : l'extrémité droite (50, 0) passe en (40, −88).
    expect(cap[0]?.piece.p0).toEqual({ xMm: 40, yMm: -88 });
    expect(cap.find((e) => e.piece.p1.xMm === 0 && e.piece.p1.yMm === 0)).toBeDefined();
  });

  it('déduit le rôle structurel du rôle sémantique, sauf si la fiche l’écrit (le pli)', () => {
    const roles = Object.fromEntries(
      panelOf(pattern, 'front').edges.map((e) => [e.id.replace(/-\d+$/, ''), e.role]),
    );
    expect(roles).toEqual({ fold: 'fold', hem: 'hem', side: 'seam', arm: 'seam', top: 'opening' });
    const edge = (semanticRole: Parameters<typeof structuralRoleOf>[0]['semanticRole']) =>
      structuralRoleOf({ id: 'x', semanticRole, from: 'a', to: 'b' });
    expect([edge('sleeveHem'), edge('waist'), edge('dart'), edge('centerFront')]).toEqual([
      'hem',
      'waistline',
      'seam',
      'seam',
    ]);
    expect(
      structuralRoleOf({ id: 'x', semanticRole: 'hem', role: 'opening', from: 'a', to: 'b' }),
    ).toBe('opening');
  });

  it('ne coupe pas une couture dont les deux bords ont la même longueur', () => {
    expect(panelOf(pattern, 'front').edges.filter((e) => e.semanticRole === 'side')).toHaveLength(
      1,
    );
    expect(pattern.seams.filter((s) => s.id === 'side' || s.id === 'under')).toHaveLength(2);
  });

  it('coupe la tête de manche et les emmanchures pour que chaque couture relie deux bords : le même nombre de chaque côté', () => {
    const cap = panelOf(pattern, 'sleeve').edges.filter((e) => e.semanticRole === 'sleeveCap');
    const arms = ['front', 'back'].flatMap((id) =>
      panelOf(pattern, id).edges.filter((e) => e.semanticRole === 'armhole'),
    );
    const armSeams = pattern.seams.filter((s) => s.id.startsWith('arm'));
    expect(cap.length).toBe(arms.length);
    expect(armSeams).toHaveLength(cap.length);
    expect(cap.map((e) => e.id)).toEqual(cap.map((_, i) => `cap-${i + 1}`));
    for (const edge of [...cap, ...arms]) expect(edge.role).toBe('seam');
  });

  it('répartit l’embu déclaré au prorata sur les paires de sous-bords, tel que les longueurs le donnent', () => {
    const byId = (panelId: string, id: string) =>
      panelOf(pattern, panelId).edges.find((e) => e.id === id) as PatternEdge;
    const armSeams = pattern.seams.filter((s) => s.id.startsWith('arm'));
    let total = 0;
    for (const seam of armSeams) {
      const gap =
        lengthOf(byId(seam.a.panelId, seam.a.edgeId)) -
        lengthOf(byId(seam.b.panelId, seam.b.edgeId));
      expect(seam.easeMm, seam.id).toBeDefined();
      expect(Math.abs((seam.easeMm as number) - gap)).toBeLessThan(0.002);
      total += seam.easeMm as number;
    }
    expect(total).toBeCloseTo(ease, 2);
  });

  it('refuse deux bords qui s’écartent de l’embu déclaré de plus que la tolérance de la fiche', () => {
    const wrong = demoSheet(ease + 2, 0.5);
    const attempt = (): unknown => assemblePattern(wrong, demoParts(wrong), {});
    expect(attempt).toThrow(SeamError);
    expect(attempt).toThrow(
      'seam arm: the length gap between the two sides differs from the declared ease by more than 0.5 mm',
    );
    const close = demoSheet(ease + 0.4, 0.5);
    expect(() => assemblePattern(close, demoParts(close), {})).not.toThrow();
  });

  it('n’écrit pas un embu sous le demi-millimètre : les deux bords sont dits de même longueur', () => {
    const none = demoSheet(0.3, 1000);
    const result = assemblePattern(none, demoParts(none), {});
    expect(result.seams.filter((s) => s.easeMm !== undefined)).toEqual([]);
  });

  it('refuse une paire de sous-bords dont l’écart dépasse les 50 mm que le contrat admet pour un embu', () => {
    // Le pli (200 mm) contre l'ourlet du dos (100 mm) : un embu de 100 mm, déclaré, mais qu'aucune couture ne peut porter.
    const odd: ModelSheet = {
      ...sheet,
      seams: [
        {
          id: 'odd',
          a: [{ part: 'front', edge: 'fold' }],
          b: [{ part: 'back', edge: 'hem' }],
          align: 'same',
          ease: { mm: 100 },
          toleranceMm: 1,
        },
      ],
    };
    const attempt = (): unknown => assemblePattern(odd, demoParts(odd), {});
    expect(attempt).toThrow(SeamError);
    expect(attempt).toThrow(
      'seam odd: the ease of a pair of pieces exceeds 50 mm, the contract maximum',
    );
  });

  it('lit la longueur visée dans les valeurs de FreeSewing quand la fiche le déclare', () => {
    const viaStore: ModelSheet = {
      ...sheet,
      seams: sheet.seams.map((seam) =>
        seam.id === 'arm' ? { ...seam, ease: { store: 'x.target' } } : seam,
      ),
    };
    const parts = demoParts(viaStore);
    const armholes = ['front', 'back'].flatMap((id) =>
      panelOf(pattern, id).edges.filter((e) => e.semanticRole === 'armhole'),
    );
    const lengthB = armholes.reduce((total, edge) => total + lengthOf(edge), 0);
    const result = assemblePattern(viaStore, parts, { 'x.target': lengthB + ease });
    expect(
      result.seams.filter((s) => s.id.startsWith('arm') && s.easeMm !== undefined).length,
    ).toBeGreaterThan(2);
    expect(() => assemblePattern(viaStore, parts, {})).toThrow(SheetError);
    expect(() => assemblePattern(viaStore, parts, {})).toThrow(
      'store value "x.target" was not read from FreeSewing',
    );
  });

  it('est déterministe et ne modifie ni la fiche ni les pièces tracées', () => {
    const parts = demoParts(sheet);
    const before = JSON.stringify([sheet, parts]);
    const first = assemblePattern(sheet, parts, {});
    expect(JSON.stringify(assemblePattern(sheet, parts, {}))).toBe(JSON.stringify(first));
    expect(JSON.stringify([sheet, parts])).toBe(before);
  });
});

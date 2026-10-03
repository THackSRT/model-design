import { beforeAll, describe, expect, it } from 'vitest';
import {
  buildAvatar,
  drapeGarment,
  loadAvatarEngine,
  placeGarment,
  type AvatarShape,
  type DrapeOutcome,
} from '../src/node.js';
import { meshGarment, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { costRatio } from './helpers.js';
import {
  bandBottom as bandBottomOf,
  fixture,
  hemVertices as hemVerticesOf,
  jobOf,
  MEASUREMENTS,
  median,
  seamGaps,
  startStrainP95,
} from './drape-helpers.js';

// Jupe cercle en brouillon sur l'avatar, bras à 90° (ADR 0013, 1.19e2a4 : départ en godets, réglage fin, double passe
// de couture). Mesures fictives des références, popeline.

const spec = fixture('circle-skirt');
const ARMS = { armAngleDeg: 90 };
const MAX_START_GAP_MM = 120;
const MAX_START_STRAIN = 0.25;
const SKIRT_LENGTH_MM = 650;
const HIP_RADIUS_MM = MEASUREMENTS.hipGirthMm / (2 * Math.PI);

describe('jupe cercle en brouillon sur l’avatar, bras à 90°', () => {
  let avatar: AvatarShape;
  let out: DrapeOutcome;
  const mesh = meshGarment(spec, 'draft');
  const hemVertices = (): number[] => hemVerticesOf(mesh, spec);
  const bandBottom = (positions: ArrayLike<number>): number => bandBottomOf(mesh, positions);

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, ARMS);
    out = drapeGarment(jobOf(spec, { avatar: ARMS }));
  });

  it('part avec un allongement des arêtes à 25 % au 95e centile (avant : 222 %), coutures à moins de 120 mm', () => {
    const start = placeGarment(mesh, spec, avatar);
    expect(start.every(Number.isFinite)).toBe(true);
    expect(startStrainP95(mesh, start)).toBeLessThanOrEqual(MAX_START_STRAIN);
    expect(seamGaps(start, mesh.cloth.stitches)).toBeLessThan(MAX_START_GAP_MM);
  });

  it('drape en succès, convergé en 400 pas au plus', () => {
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.result.converged).toBe(true);
    expect(out.result.simulatedSteps).toBeLessThanOrEqual(400);
  });

  it('ne pénètre pas le corps (parité) et ferme ses coutures', () => {
    if (!out.ok) throw new Error('drape failed');
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
  });

  it('finit à la taille : bas de ceinture entre waist − 40 et waist + 10 mm', () => {
    if (!out.ok) throw new Error('drape failed');
    const bottom = bandBottom(out.positionsMm);
    expect(bottom).toBeGreaterThanOrEqual(avatar.landmarksMm.waist - 40);
    expect(bottom).toBeLessThanOrEqual(avatar.landmarksMm.waist + 10);
  });

  it('garde son volume : rayon médian de l’ourlet au moins 1,5 fois celui de la hanche', () => {
    if (!out.ok) throw new Error('drape failed');
    const hem = hemVertices();
    const p = out.positionsMm;
    const cx = hem.reduce((s, v) => s + (p[3 * v] as number), 0) / hem.length;
    const cz = hem.reduce((s, v) => s + (p[3 * v + 2] as number), 0) / hem.length;
    const radius = median(
      hem.map((v) => Math.hypot((p[3 * v] as number) - cx, (p[3 * v + 2] as number) - cz)),
    );
    expect(radius).toBeGreaterThanOrEqual(1.5 * HIP_RADIUS_MM);
  });

  it('pend à sa longueur : ourlet au moins 0,8 fois la longueur de jupe sous le bas de ceinture', () => {
    if (!out.ok) throw new Error('drape failed');
    const final = out.positionsMm;
    const hemHeight = median(hemVertices().map((v) => final[3 * v + 1] as number));
    expect(hemHeight).toBeLessThanOrEqual(bandBottom(final) - 0.8 * SKIRT_LENGTH_MM);
  });

  // Un seul drapé supplémentaire : il sert au budget de coût et, comparé au premier, au déterminisme au bit près.
  // Budget mesuré : 24,6 à 25,1 au repos, 29,2 sous charge (ADR 0013) ; marge pour la variance du poste.
  it('est déterministe au bit près et coûte peu rapporté à la charge de référence (budget relatif)', () => {
    let again: DrapeOutcome | undefined;
    const ratio = costRatio(() => {
      again = drapeGarment(jobOf(spec, { avatar: ARMS }));
    });
    expect(ratio).toBeLessThan(40);
    if (!again?.ok || !out.ok) throw new Error('drape failed');
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
    expect(again.result).toEqual(out.result);
  });
});

// Bras à 9° (angle par défaut) : l'avant-bras traverse le volume de la jupe (mesuré : 13 à 16 mm au départ) ; un succès
// doit rester conforme, sinon un problème typé, jamais un faux succès.
describe('jupe cercle, bras à 9°', () => {
  it('rend un succès conforme ou un problème typé', async () => {
    await loadAvatarEngine();
    const out = drapeGarment(jobOf(spec, { avatar: { armAngleDeg: 9 } }));
    if (!out.ok) {
      expect(['seam-not-closed', 'body-penetration']).toContain(out.problem.type);
      return;
    }
    expect(out.diagnostics.maxPenetrationMm).toBeLessThanOrEqual(PENETRATION_TOLERANCE_MM);
    expect(out.diagnostics.maxStitchGapMm).toBeLessThanOrEqual(SEAM_TOLERANCE_MM);
    expect(out.result.ease.minMm).toBeGreaterThanOrEqual(-3);
  });
});

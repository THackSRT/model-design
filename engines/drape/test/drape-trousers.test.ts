import { beforeAll, describe, expect, it } from 'vitest';
import type { Panel } from '@atelier/contracts-ts';
import {
  buildAvatar,
  drapeGarment,
  loadAvatarEngine,
  placeGarment,
  type AvatarShape,
  type DrapeOutcome,
} from '../src/node.js';
import { meshGarment, PENETRATION_TOLERANCE_MM, SEAM_TOLERANCE_MM } from '../src/index.js';
import { pelvisWeight } from '../src/placement/leg-align.js';
import { pieceField } from '../src/placement/piece-field.js';
import { costRatio } from './helpers.js';
import { fixture, jobOf, MEASUREMENTS } from './drape-helpers.js';

// Pantalon en brouillon sur l'avatar, posé jambe par jambe (ADR 0013, 1.19e2b). Mesures fictives des références, popeline.

const spec = fixture('trousers');
const MAX_START_GAP_MM = 120;
const CROSSED_LEG_MM = 10;

function seamGaps(positions: ArrayLike<number>, stitches: Uint32Array): number {
  let widest = 0;
  for (let k = 0; k < stitches.length; k += 2) {
    const [a, b] = [stitches[k] as number, stitches[k + 1] as number];
    const dx = (positions[3 * a] as number) - (positions[3 * b] as number);
    const dy = (positions[3 * a + 1] as number) - (positions[3 * b + 1] as number);
    const dz = (positions[3 * a + 2] as number) - (positions[3 * b + 2] as number);
    widest = Math.max(widest, Math.sqrt(dx * dx + dy * dy + dz * dz));
  }
  return widest;
}

describe('pantalon en brouillon sur l’avatar', () => {
  let avatar: AvatarShape;
  let out: DrapeOutcome;
  const mesh = meshGarment(spec, 'draft');
  const panels = new Map<string, Panel>(spec.panels.map((p) => [p.id, p]));

  beforeAll(async () => {
    await loadAvatarEngine();
    avatar = buildAvatar(MEASUREMENTS, {});
    out = drapeGarment(jobOf(spec));
  });

  it('part avec côtés et entrejambe à moins de 120 mm (avant : 203 mm à l’entrejambe haute)', () => {
    const start = placeGarment(mesh, spec, avatar);
    expect(start.every(Number.isFinite)).toBe(true);
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

  it('finit à la taille : médiane des sommets de ceinture entre waist − 60 et waist + 10 mm', () => {
    if (!out.ok) throw new Error('drape failed');
    const heights: number[] = [];
    for (const piece of mesh.pieces) {
      for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
        const edge = mesh.vertexEdge[v] as number;
        if (edge >= 0 && panels.get(piece.panelId)?.edges[edge]?.role === 'waistline') {
          heights.push(out.positionsMm[3 * v + 1] as number);
        }
      }
    }
    heights.sort((a, b) => a - b);
    const waist = heights[heights.length >> 1] as number;
    expect(waist).toBeGreaterThanOrEqual(avatar.landmarksMm.waist - 60);
    expect(waist).toBeLessThanOrEqual(avatar.landmarksMm.waist + 10);
  });

  it('ne croise pas les jambes : sous l’entrejambe, pièces gauches à x > −10 mm, droites à x < 10 mm', () => {
    if (!out.ok) throw new Error('drape failed');
    let checked = 0;
    for (const piece of mesh.pieces) {
      const sign = piece.side === 'left' ? 1 : -1;
      for (let v = piece.vertexStart; v < piece.vertexStart + piece.vertexCount; v++) {
        if ((out.positionsMm[3 * v + 1] as number) >= avatar.landmarksMm.crotch) continue;
        checked++;
        expect(sign * (out.positionsMm[3 * v] as number)).toBeGreaterThan(-CROSSED_LEG_MM);
      }
    }
    expect(checked).toBeGreaterThan(500);
  });

  it('est déterministe au bit près', () => {
    const again = drapeGarment(jobOf(spec));
    expect(again.ok).toBe(out.ok);
    if (!again.ok || !out.ok) {
      expect(again).toEqual(out);
      return;
    }
    expect(Buffer.from(again.positionsMm.buffer).equals(Buffer.from(out.positionsMm.buffer))).toBe(
      true,
    );
    expect(again.result).toEqual(out.result);
  });

  it('coûte peu rapporté à la charge de référence (budget relatif)', () => {
    const ratio = costRatio(() => {
      drapeGarment(jobOf(spec));
    });
    expect(ratio).toBeLessThan(20);
  });
});

describe('pantalon : aides de la pose par jambe', () => {
  it('le poids du bassin passe de 0 à l’entrejambe à 1 cinquante millimètres au-dessus', () => {
    expect(pelvisWeight(700, 770)).toBe(0);
    expect(pelvisWeight(770, 770)).toBe(0);
    expect(pelvisWeight(795, 770)).toBeCloseTo(0.5, 12);
    expect(pelvisWeight(900, 770)).toBe(1);
  });

  it('l’étendue de l’isoligne d’une pièce de jambe encadre les sommets de ce niveau', () => {
    const piece = mesh().pieces.find((p) => p.panelId === 'front-left' && p.copy === 0);
    if (!piece) throw new Error('piece not found');
    const field = pieceField(mesh(), piece, spec.panels[0] as Panel, spec.seams);
    if (!field) throw new Error('field not found');
    const [lo, hi] = field.span(100);
    expect(lo).toBeLessThan(hi);
    for (let i = 0; i < piece.vertexCount; i++) {
      if (Math.abs((field.d[i] as number) - 100) < 1) {
        expect(field.s[i] as number).toBeGreaterThanOrEqual(lo - 6);
        expect(field.s[i] as number).toBeLessThanOrEqual(hi + 6);
      }
    }
    expect(field.span(1e5)).toEqual([0, 0]);
  });
});

function mesh() {
  return meshGarment(spec, 'draft');
}

import { beforeAll, describe, expect, it } from 'vitest';
import type { GarmentSpec, Panel } from '@atelier/contracts-ts';
import { meshGarment } from '../src/index.js';
import {
  buildAvatar,
  garmentHoldsOf,
  keepClearOfBody,
  loadAvatarEngine,
  placeGarment,
} from './anchor-helpers.js';
import { pieceField } from '../src/placement/piece-field.js';
import { fixture, MEASUREMENTS } from './drape-helpers.js';

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing value');
  return value;
}

const panelOf = (spec: GarmentSpec, id: string): Panel =>
  must(spec.panels.find((p) => p.id === id));
const anchorOf = (spec: GarmentSpec, id: string): readonly [number, number] =>
  must(panelOf(spec, id).placement).anchor.point;

function fieldOf(spec: GarmentSpec, panelId: string) {
  const mesh = meshGarment(spec, 'draft');
  const piece = must(mesh.pieces.find((p) => p.panelId === panelId && p.copy === 0));
  const field = must(pieceField(mesh, piece, panelOf(spec, panelId), spec.seams));
  return { mesh, piece, field };
}

describe('ligne d’ancrage', () => {
  it('enjambe une pince : la longueur de la ligne ne compte pas son ouverture', () => {
    const { field } = fieldOf(fixture('straight-skirt'), 'back-right');
    // waist-3 + waist-2 + waist-1 du dos droit : 45,16 + 15,28 + 92,31 mm ; deux pinces de 32 mm sautées.
    expect(field.line.length).toBeCloseTo(152.75, 1);
    expect(field.line.darts.length).toBe(2);
  });

  it('les deux côtés d’une pince partent au même endroit', () => {
    const { mesh, piece, field } = fieldOf(fixture('straight-skirt'), 'back-right');
    // Sommets sur les jambes de la pince 1 (x de patron 45,16 à 77,24 à la taille) : même abscisse de part et d’autre.
    const near = (x: number, y: number): number => {
      for (let i = 0; i < piece.vertexCount; i++) {
        const g = piece.vertexStart + i;
        const dx = (mesh.cloth.flatMm[2 * g] as number) - piece.shiftXMm - x;
        const dy = (mesh.cloth.flatMm[2 * g + 1] as number) - y;
        if (dx * dx + dy * dy < 1) return field.s[i] as number;
      }
      throw new Error('vertex not found');
    };
    expect(near(45.16, 600)).toBeCloseTo(near(77.24, 600), 0);
  });

  it('s’arrête aux coins de plus de 45° : ceinture rectangulaire et arc de taille', () => {
    const band = fieldOf(fixture('circle-skirt'), 'waistband-front');
    expect(band.field.line.length).toBeCloseTo(325, 0);
    expect(band.field.line.darts.length).toBe(0);
    const arc = fieldOf(fixture('circle-skirt'), 'front');
    expect(arc.field.line.length).toBeGreaterThan(300);
    expect(arc.field.line.length).toBeLessThan(330);
  });

  it('sur une droite on retrouve (s, −d) = (x, y) depuis l’ancre', () => {
    const spec = fixture('circle-skirt');
    const { mesh, piece, field } = fieldOf(spec, 'waistband-front');
    const [ax, ay] = anchorOf(spec, 'waistband-front');
    for (let i = 0; i < piece.vertexCount; i++) {
      const g = piece.vertexStart + i;
      const x = (mesh.cloth.flatMm[2 * g] as number) - piece.shiftXMm;
      const y = mesh.cloth.flatMm[2 * g + 1] as number;
      expect(field.s[i]).toBeCloseTo(x - ax, 2);
      expect(-(field.d[i] as number)).toBeCloseTo(y - ay, 2);
    }
  });

  it('jupe droite : sous les pinces, le repérage redonne le x et le y du patron', () => {
    const spec = fixture('straight-skirt');
    for (const id of ['front', 'back-right', 'back-left']) {
      const { mesh, piece, field } = fieldOf(spec, id);
      const [ax, ay] = anchorOf(spec, id);
      const anchorU = piece.mirrored ? -ax : ax;
      let checked = 0;
      for (let i = 0; i < piece.vertexCount; i++) {
        const g = piece.vertexStart + i;
        const y = mesh.cloth.flatMm[2 * g + 1] as number;
        if (y > 300) continue;
        // Sous la pointe des pinces la pièce garde sa largeur : s vaut le x du patron depuis l’ancre.
        const x = (mesh.cloth.flatMm[2 * g] as number) - piece.shiftXMm - anchorU;
        expect(field.s[i]).toBeCloseTo(x, 1);
        expect(-(field.d[i] as number)).toBeCloseTo(y - ay, 1);
        checked++;
      }
      expect(checked).toBeGreaterThan(20);
    }
  });
});

describe('tenues de ceinture', () => {
  const spec = fixture('straight-skirt');
  const mesh = meshGarment(spec, 'draft');
  let start: Float64Array;
  beforeAll(async () => {
    await loadAvatarEngine();
    start = placeGarment(mesh, spec, buildAvatar(MEASUREMENTS, {}));
    keepClearOfBody(start, buildAvatar(MEASUREMENTS, {}).body);
  });

  it('tient les bords waistline à la hauteur de départ, sur l’axe vertical', () => {
    const holds = must(garmentHoldsOf(mesh, spec, buildAvatar(MEASUREMENTS, {}), start));
    expect(holds.vertices.length).toBeGreaterThan(10);
    for (let k = 0; k < holds.vertices.length; k++) {
      const v = holds.vertices[k] as number;
      const panel = panelOf(spec, must(mesh.pieces[mesh.vertexPiece[v] as number]).panelId);
      expect(must(panel.edges[mesh.vertexEdge[v] as number]).role).toBe('waistline');
      expect([holds.axes[3 * k], holds.axes[3 * k + 1], holds.axes[3 * k + 2]]).toEqual([0, 1, 0]);
      expect(holds.targetsMm[k]).toBe(start[3 * v + 1]);
    }
  });
});

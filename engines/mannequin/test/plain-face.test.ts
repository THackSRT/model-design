import { readFile } from 'node:fs/promises';
import { beforeAll, describe, expect, it } from 'vitest';
import { createMakeHuman, type MakeHuman, type MakeHumanFit } from '../src/core/makehuman.js';
import { plainFace, type PlainFace } from '../src/core/plain-face.js';

const DATA = new URL('../assets/makehuman.mhz', import.meta.url);

/** Avancée maximale (z) des sommets affichés au-dessus du cou. */
function frontmost(pos: Float32Array, neckY: number, drop?: Uint8Array): number {
  let z = -Infinity;
  for (let v = 0; v < pos.length / 3; v++) {
    if (!drop?.[v] && (pos[3 * v + 1] ?? 0) > neckY) z = Math.max(z, pos[3 * v + 2] ?? 0);
  }
  return z;
}

/** Sommets au-dessus du cou : [x, y, z, indice]. */
function headVertices(pos: Float32Array, neckY: number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (let v = 0; v < pos.length / 3; v++) {
    const [x = 0, y = 0, z = 0] = pos.subarray(3 * v, 3 * v + 3);
    if (y > neckY) out.push([x, y, z, v]);
  }
  return out;
}

describe('visage sans traits', () => {
  let mh: MakeHuman;
  let fit: MakeHumanFit;
  let neckY: number;
  let face: PlainFace;
  beforeAll(async () => {
    mh = createMakeHuman(async () => new Uint8Array(await readFile(DATA)));
    await mh.load();
    fit = mh.fit({ stature: 165, chest: 90, waist: 72, hip: 98 }, { sex: 'femme', age: 30 });
    neckY = fit.measured.rings['neck']?.center[1] ?? 0;
    face = plainFace(fit.pos, mh.baseTriangles(), neckY);
  });

  it('masque les deux globes oculaires et rien d’autre du corps', () => {
    const dropped = face.drop.reduce((n, d) => n + d, 0);
    expect(dropped).toBeGreaterThan(0);
    expect(dropped).toBeLessThan(200);
  });

  it('efface le nez : le visage avance nettement moins', () => {
    const before = frontmost(fit.pos, neckY);
    const after = frontmost(face.pos, neckY, face.drop);
    expect(before - after).toBeGreaterThan(1);
  });

  it('garde la forme de la tête : crâne, nuque et oreilles ne bougent pas', () => {
    const neckZ = fit.measured.rings['neck']?.center[2] ?? 0;
    const skull = headVertices(fit.pos, neckY).filter(
      ([x, , z]) => Math.abs(x) > 6.5 || z < neckZ + 1,
    );
    expect(skull.length).toBeGreaterThan(500);
    for (const [, , , v] of skull) {
      expect([...face.pos.subarray(3 * v, 3 * v + 3)]).toEqual([
        ...fit.pos.subarray(3 * v, 3 * v + 3),
      ]);
    }
  });

  it('ne change aucun tour mesuré', () => {
    const measured = mh.measure(face.pos, 165);
    for (const key of ['neck', 'chest', 'waist', 'hip']) {
      expect(measured[key]).toBeCloseTo(fit.measured[key] ?? 0, 2);
    }
  });
});

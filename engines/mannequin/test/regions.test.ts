import { describe, expect, it } from 'vitest';
import { PAIRS } from '../src/core/morph.js';
import { buildRegions, REGION_KEYS, trisToBase } from '../src/core/regions.js';
import type { MhData } from '../src/core/types.js';

function dataWithTargets(): MhData {
  const targets: MhData['targets'] = {};
  for (const key of REGION_KEYS) {
    // trois sommets touchés : deux fortement déplacés (la bande), un faiblement
    targets[`${PAIRS[key]}-incr`] = {
      idx: Uint16Array.from([0, 1, 2]),
      d: Int16Array.from([10, 0, 0, 0, 9, 0, 1, 0, 0]),
    };
  }
  return { header: { nBase: 4 }, targets } as unknown as MhData;
}

describe('buildRegions', () => {
  it('rend une zone par clé de mesure, avec sa bande de sommets les plus déplacés', () => {
    const regions = buildRegions(dataWithTargets());
    expect(Object.keys(regions)).toEqual([...REGION_KEYS]);
    const waist = regions['waist'];
    expect(waist?.verts).toEqual([0, 1, 2]);
    expect(waist?.band).toEqual([0, 1]);
    expect([...(waist?.inRegion ?? [])]).toEqual([1, 1, 1, 0]);
  });

  it('signale une cible de mensuration absente', () => {
    const data = dataWithTargets();
    const kneeKey = `${PAIRS['knee']}-incr`;
    data.targets = Object.fromEntries(Object.entries(data.targets).filter(([k]) => k !== kneeKey));
    expect(() => buildRegions(data)).toThrow(/knee/);
  });
});

describe('trisToBase', () => {
  it('exprime les triangles de rendu en sommets de base', () => {
    const tb = trisToBase({
      tris: Uint16Array.from([0, 1, 4, 2, 3, 4]),
      rv2b: Uint16Array.from([0, 1, 2, 3, 3]),
    });
    expect([...tb]).toEqual([0, 1, 3, 2, 3, 3]);
  });
});

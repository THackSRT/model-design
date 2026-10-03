import { describe, expect, it } from 'vitest';
import { makeFrame } from '../src/placement/frames.js';
import { PlacementError, type AvatarShape } from '../src/placement/types.js';

// Repère de manche (ADR 0018) : bras pendant, incliné, horizontal ; refus d'un bras au-dessus de l'horizontale.

function avatarWith(axis: [number, number, number]): AvatarShape {
  const arm = { shoulderMm: [150, 1300, 20], wristMm: [150, 1000, 20], axis, lengthMm: 430 };
  return {
    body: undefined,
    landmarksMm: {},
    arms: { left: arm, right: arm },
  } as unknown as AvatarShape;
}

const angle = (deg: number): [number, number, number] => {
  const t = (deg * Math.PI) / 180;
  const k = Math.sqrt(1 - 0.13 * 0.13);
  return [k * Math.sin(t), -k * Math.cos(t), 0.13];
};

describe('repère de manche', () => {
  it('à 90° : origine à l’épaule, axe horizontal, face extérieure vers le haut (bras gauche)', () => {
    const f = makeFrame('arm', 'left', avatarWith(angle(90)), 1300);
    expect(f.origin(0)).toEqual([150, 1300, 20]);
    expect(f.up[1]).toBeCloseTo(0, 12);
    expect(f.e1[1]).toBeCloseTo(1, 6);
    const dot = f.e1[0] * f.up[0] + f.e1[1] * f.up[1] + f.e1[2] * f.up[2];
    expect(dot).toBeCloseTo(0, 9);
  });

  it('de 9° à 90° : e1 reste unitaire, perpendiculaire à l’axe et continue', () => {
    let previous = makeFrame('arm', 'left', avatarWith(angle(9)), 1300).e1;
    for (const deg of [30, 60, 80, 90]) {
      const { e1, up } = makeFrame('arm', 'left', avatarWith(angle(deg)), 1300);
      expect(Math.hypot(...e1)).toBeCloseTo(1, 9);
      expect(e1[0] * up[0] + e1[1] * up[1] + e1[2] * up[2]).toBeCloseTo(0, 9);
      expect(e1[0] * previous[0] + e1[1] * previous[1] + e1[2] * previous[2]).toBeGreaterThan(0.8);
      previous = e1;
    }
  });

  it('bras droit (axe en −x) : e1 vaut +x pendant, −y à 90°, de façon continue', () => {
    const mirror = (a: [number, number, number]): [number, number, number] => [-a[0], a[1], a[2]];
    let previous = makeFrame('arm', 'right', avatarWith(mirror(angle(9))), 1300).e1;
    expect(previous[0]).toBeGreaterThan(0.9);
    for (const deg of [30, 60, 80, 90]) {
      const { e1, up } = makeFrame('arm', 'right', avatarWith(mirror(angle(deg))), 1300);
      expect(e1[0] * up[0] + e1[1] * up[1] + e1[2] * up[2]).toBeCloseTo(0, 9);
      expect(e1[0] * previous[0] + e1[1] * previous[1] + e1[2] * previous[2]).toBeGreaterThan(0.8);
      previous = e1;
    }
    expect(previous[1]).toBeCloseTo(-1, 6);
  });

  it('refuse un bras qui pointe au-dessus de l’horizontale', () => {
    expect(() => makeFrame('arm', 'left', avatarWith([0.9, 0.4, 0]), 1300)).toThrow(PlacementError);
  });
});

import { PlacementError, type AvatarArm, type AvatarShape, type Vec3, type Zone } from './types.js';

// Repère d'un plan de coupe : un axe « vers le haut » (la verticale, ou l'axe du bras pour une manche), deux
// directions dans le plan. e1 = gauche du porteur, e2 = avant, e1 × e2 = −haut (comme x × z = −y).

export type Side = 'left' | 'right' | 'center';

export interface Frame {
  zone: Zone;
  side: Side;
  up: Vec3;
  e1: Vec3;
  e2: Vec3;
  /** Point de l'axe au niveau l (mm mesurés vers le haut depuis le niveau d'ancrage). */
  origin(l: number): Vec3;
}

const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Axe d'un bras plus incliné que cela sur l'horizontale : pas de manche à poser (angle minimal de 0,3 en sinus). */
const MIN_AXIS_SLOPE = 0.3;

function armFrame(side: Side, arm: AvatarArm, heightMm: number): Frame {
  const up: Vec3 = [-arm.axis[0], -arm.axis[1], -arm.axis[2]];
  if (up[1] < MIN_AXIS_SLOPE)
    throw new PlacementError('placement-failed', undefined, 'arm axis is not vertical enough');
  const t = (heightMm - arm.shoulderMm[1]) / up[1];
  const origin0: Vec3 = [
    arm.shoulderMm[0] + up[0] * t,
    arm.shoulderMm[1] + up[1] * t,
    arm.shoulderMm[2] + up[2] * t,
  ];
  const wx = dot([1, 0, 0], up);
  const len = Math.sqrt(1 - wx * wx);
  const e1: Vec3 = [(1 - wx * up[0]) / len, (0 - wx * up[1]) / len, (0 - wx * up[2]) / len];
  const e2 = cross(e1, up);
  return {
    zone: 'arm',
    side,
    up,
    e1,
    e2,
    origin: (l) => [origin0[0] + up[0] * l, origin0[1] + up[1] * l, origin0[2] + up[2] * l],
  };
}

/** Repère de la zone `zone` du côté `side`, au niveau d'ancrage `heightMm` (mm depuis le sol). */
export function makeFrame(zone: Zone, side: Side, avatar: AvatarShape, heightMm: number): Frame {
  if (zone === 'arm') {
    if (side === 'center') {
      throw new PlacementError(
        'placement-failed',
        undefined,
        'an arm panel needs a left or right side',
      );
    }
    return armFrame(side, avatar.arms[side], heightMm);
  }
  if (zone === 'leg' && side === 'center') {
    throw new PlacementError(
      'placement-failed',
      undefined,
      'a leg panel needs a left or right side',
    );
  }
  return {
    zone,
    side,
    up: [0, 1, 0],
    e1: [1, 0, 0],
    e2: [0, 0, 1],
    origin: (l) => [0, heightMm + l, 0],
  };
}

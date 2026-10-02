/*
 * Pose : bras abaissés (peau liée au squelette MakeHuman). Rotation de la chaîne du bras autour
 * de l'épaule, pondérée par les poids de peau (transition douce vers l'épaule).
 */
import { cross, dot, normalize } from './geometry.js';
import type { MhData, Vec3 } from './types.js';

type PoseData = Pick<MhData, 'joints' | 'arm'>;

/** Rotation d'axe k (unitaire) et d'angle th autour du point J. */
interface ArmFrame {
  shoulder: Vec3;
  /** Centre du poignet avant la pose. */
  wrist: Vec3;
  axis: Vec3;
  angle: number;
}

export interface ArmJoints {
  shoulder: Vec3;
  wrist: Vec3;
}

export interface PoseResult {
  pos: Float32Array;
  /** Applique la rotation complète de chaque bras à un point (anneaux de mesure). */
  rot: { L: (p: Vec3) => Vec3; R: (p: Vec3) => Vec3 };
  /** Articulations du bras posé (cm) : épaule (pivot, immobile) et centre du poignet. */
  joints: { L: ArmJoints; R: ArmJoints };
}

function centroid(pos: Float32Array, list: number[]): Vec3 {
  const c = [0, 1, 2].map(
    (q) => list.reduce((a, i) => a + (pos[3 * i + q] as number), 0) / list.length,
  );
  return c as Vec3;
}

/** Rotation qui amène la direction épaule-poignet à `angleDeg` de la verticale. */
function armFrame(pos: Float32Array, data: PoseData, side: 'L' | 'R', angleDeg: number): ArmFrame {
  const shoulder = centroid(pos, data.joints['upperarm01.' + side] as number[]);
  const wrist = centroid(pos, data.joints['wrist.' + side] as number[]);
  const d = normalize([wrist[0] - shoulder[0], wrist[1] - shoulder[1], wrist[2] - shoulder[2]]);
  const sg = side === 'L' ? 1 : -1;
  const a = (angleDeg * Math.PI) / 180;
  const t = normalize([sg * Math.sin(a), -Math.cos(a), d[2] * 0.4]);
  const k = cross(d, t);
  const s = Math.hypot(...k);
  const c = dot(d, t);
  const axis: Vec3 = [k[0] / (s || 1), k[1] / (s || 1), k[2] / (s || 1)];
  return { shoulder, wrist, axis, angle: Math.atan2(s, c) };
}

/** Tourne le point p de la fraction `frac` de la rotation (formule de Rodrigues). */
function rotate(f: ArmFrame, p: Vec3, frac: number): Vec3 {
  const { shoulder: J, axis: k } = f;
  const ang = f.angle * frac;
  const cs = Math.cos(ang);
  const sn = Math.sin(ang);
  const v: Vec3 = [p[0] - J[0], p[1] - J[1], p[2] - J[2]];
  const kv = dot(k, v);
  const kx = cross(k, v);
  return [
    J[0] + v[0] * cs + kx[0] * sn + k[0] * kv * (1 - cs),
    J[1] + v[1] * cs + kx[1] * sn + k[1] * kv * (1 - cs),
    J[2] + v[2] * cs + kx[2] * sn + k[2] * kv * (1 - cs),
  ];
}

/**
 * Abaisse les bras ; angle = écart du bras par rapport à la verticale (degrés).
 * Retourne { pos, rot: { L(p), R(p) } } pour transformer aussi des points (anneaux de mesure).
 */
export function pose(data: PoseData, pos: Float32Array, angle = 9): PoseResult {
  const out = Float32Array.from(pos);
  const rots = {} as PoseResult['rot'];
  const joints = {} as PoseResult['joints'];
  for (const side of ['L', 'R'] as const) {
    const frame = armFrame(pos, data, side, angle);
    const { idx, w } = data.arm[side];
    for (let i = 0; i < idx.length; i++) {
      const j = 3 * (idx[i] as number);
      const f = (w[i] as number) / 255;
      // rotation partielle (et non mélange linéaire) : l'épaule s'arrondit sans s'écraser
      const r = rotate(frame, [pos[j] as number, pos[j + 1] as number, pos[j + 2] as number], f);
      out[j] = r[0];
      out[j + 1] = r[1];
      out[j + 2] = r[2];
    }
    rots[side] = (p) => rotate(frame, p, 1);
    joints[side] = { shoulder: frame.shoulder, wrist: rotate(frame, frame.wrist, 1) };
  }
  return { pos: out, rot: rots, joints };
}

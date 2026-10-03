import type { Panel } from '@atelier/contracts-ts';
import type { BodyMesh } from '../core/types.js';

// Types de la mise en place des pièces autour du corps (ADR 0013, tâche 1.19e). Millimètres, y vers le haut,
// x vers la gauche du porteur, z vers l'avant (repère du moteur mannequin).

/** Point d'un plan de coupe : (a, b) dans le repère (e1, e2) du plan. */
export type P2 = [number, number];
export type Vec3 = readonly [number, number, number];

type Placement = NonNullable<Panel['placement']>;
export type Landmark = Placement['anchor']['landmark'];
export type Zone = Placement['zone'];

/** Bras du porteur : pivot de l'épaule, poignet, axe unitaire (épaule vers poignet) et longueur, en mm. */
export interface AvatarArm {
  shoulderMm: Vec3;
  wristMm: Vec3;
  axis: Vec3;
  lengthMm: number;
}

/** Ce que la mise en place sait de l'avatar : corps fermé (normales sortantes), hauteurs des repères, bras. */
export interface AvatarShape {
  body: BodyMesh;
  landmarksMm: Readonly<Record<Landmark, number>>;
  arms: { left: AvatarArm; right: AvatarArm };
}

/** Code stable d'un échec de mise en place (jamais de mesure dans le message). */
export type PlacementCode = 'placement-missing' | 'placement-failed';

export class PlacementError extends Error {
  constructor(
    readonly code: PlacementCode,
    readonly panelId: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'PlacementError';
  }
}

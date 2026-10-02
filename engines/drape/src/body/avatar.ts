import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import type { AvatarOptions, MeasurementSet } from '@atelier/contracts-ts';
import { loadMannequinEngine, type FitOptions, type MannequinEngine } from '@atelier/mannequin';
import type { BodyMesh } from '../core/types.js';
import type { AvatarShape } from '../placement/types.js';
import { weldBody } from './weld.js';

// Avatar du drapé (ADR 0013) : le corps que le studio affiche, recalculé par le moteur mannequin depuis les mesures
// et les options d'ajustement, jamais transmis. C'est ici, et seulement ici, que les centimètres du mannequin
// deviennent des millimètres. Les données MakeHuman se chargent une fois (asynchrone), puis `buildAvatar` est
// synchrone.

let loading: Promise<MannequinEngine> | undefined;
let engine: MannequinEngine | undefined;

async function defaultBytes(): Promise<Uint8Array> {
  const path = createRequire(import.meta.url).resolve('@atelier/mannequin/assets/makehuman.mhz');
  return new Uint8Array(await readFile(path));
}

/**
 * Charge le moteur mannequin (une fois ; les appels suivants attendent le même chargement). `loadBytes` : octets
 * du fichier de données ; par défaut, celui du paquet `@atelier/mannequin`.
 */
export async function loadAvatarEngine(
  loadBytes: () => Promise<Uint8Array> = defaultBytes,
): Promise<void> {
  loading ??= loadMannequinEngine(loadBytes).catch((error: unknown) => {
    loading = undefined;
    throw error;
  });
  engine = await loading;
}

function fitOptions(avatar: AvatarOptions): FitOptions {
  const options: FitOptions = {};
  if (avatar.age !== undefined) options.age = avatar.age;
  if (avatar.morphotype !== undefined) options.morphotype = avatar.morphotype;
  if (avatar.armAngleDeg !== undefined) options.armAngleDeg = avatar.armAngleDeg;
  return options;
}

/** Avatar : corps fermé en mm (normales vers l'extérieur), hauteurs des repères et bras. Déterministe. */
export function buildAvatar(measurements: MeasurementSet, avatar: AvatarOptions): AvatarShape {
  if (!engine) throw new Error('the avatar engine is not loaded: await loadAvatarEngine() first');
  const fitted = engine.fit(measurements, fitOptions(avatar));
  const arm = (a: typeof fitted.armsMm.left): AvatarShape['arms']['left'] => ({
    shoulderMm: a.shoulder,
    wristMm: a.wrist,
    axis: a.axis,
    lengthMm: a.lengthMm,
  });
  return {
    body: weldBody(fitted.body.positions, fitted.body.index),
    landmarksMm: { ...fitted.landmarksMm },
    arms: { left: arm(fitted.armsMm.left), right: arm(fitted.armsMm.right) },
  };
}

/** Le seul maillage du corps (mm) : voir `buildAvatar` pour les repères et les bras. */
export function buildBody(measurements: MeasurementSet, avatar: AvatarOptions): BodyMesh {
  return buildAvatar(measurements, avatar).body;
}

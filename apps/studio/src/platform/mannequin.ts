import { loadMannequinEngine, type MannequinEngine } from '@atelier/mannequin';
import dataUrl from '@atelier/mannequin/assets/makehuman.mhz?url';

let engine: Promise<MannequinEngine> | undefined;

/** Télécharge les données MakeHuman une seule fois, à la première demande. */
export function loadMannequin(): Promise<MannequinEngine> {
  engine ??= loadMannequinEngine(
    async () => new Uint8Array(await (await fetch(dataUrl)).arrayBuffer()),
  );
  return engine;
}

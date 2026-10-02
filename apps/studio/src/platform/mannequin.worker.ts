import { loadMannequinEngine, type MannequinEngine } from '@atelier/mannequin';
import dataUrl from '@atelier/mannequin/assets/makehuman.mhz?url';
import {
  handleDressRequest,
  handleFitRequest,
  type WorkerRequest,
  type WorkerResponse,
  type WorkerState,
} from './fit-protocol.js';

/** Portée du worker (la bibliothèque « DOM » du projet ne fournit pas le type dédié). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
  postMessage(message: WorkerResponse, transfer: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;

let engine: Promise<MannequinEngine> | undefined;

/** Télécharge les données MakeHuman une seule fois, à la première demande. */
function loadEngine(): Promise<MannequinEngine> {
  engine ??= loadMannequinEngine(
    async () => new Uint8Array(await (await fetch(dataUrl)).arrayBuffer()),
  );
  return engine;
}

const state: WorkerState = {};

scope.onmessage = async (event) => {
  const request = event.data;
  try {
    const { response, transfer } =
      'kind' in request
        ? handleDressRequest(state, request)
        : handleFitRequest(await loadEngine(), request, state);
    scope.postMessage(response, transfer);
  } catch (error) {
    engine = undefined; // données absentes : la demande suivante retentera le chargement
    const message = error instanceof Error ? error.message : String(error);
    scope.postMessage({ id: request.id, ok: false, message }, []);
  }
};

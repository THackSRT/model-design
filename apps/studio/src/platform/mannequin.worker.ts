import { loadMannequinEngine, type MannequinEngine } from '@atelier/mannequin';
import dataUrl from '@atelier/mannequin/assets/makehuman.mhz?url';
import { type FitRequest, type FitResponse, handleFitRequest } from './fit-protocol.js';

/** Portée du worker (la bibliothèque « DOM » du projet ne fournit pas le type dédié). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<FitRequest>) => void) | null;
  postMessage(message: FitResponse, transfer: Transferable[]): void;
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

scope.onmessage = async (event) => {
  const request = event.data;
  try {
    const { response, transfer } = handleFitRequest(await loadEngine(), request);
    scope.postMessage(response, transfer);
  } catch (error) {
    engine = undefined; // données absentes : la demande suivante retentera le chargement
    const message = error instanceof Error ? error.message : String(error);
    scope.postMessage({ id: request.id, ok: false, message }, []);
  }
};

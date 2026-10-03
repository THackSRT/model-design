import { handleCusickRequest, type CusickRequest, type CusickResponse } from './cusick-protocol.js';

/** Portée du worker (la bibliothèque « DOM » du projet ne fournit pas le type dédié). */
interface WorkerScope {
  onmessage: ((event: MessageEvent<CusickRequest>) => void) | null;
  postMessage(message: CusickResponse, transfer: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;

// La simulation est synchrone : elle occupe ce fil, jamais celui de l'interface.
scope.onmessage = (event) => {
  const { response, transfer } = handleCusickRequest(event.data);
  scope.postMessage(response, transfer);
};

import type {
  DressOptions,
  FitOptions,
  FittedMannequin,
  GarmentMesh,
  MannequinEngine,
} from '@atelier/mannequin';
import { dressMannequin } from '@atelier/mannequin';

type MeasurementSet = Parameters<MannequinEngine['fit']>[0];
type GarmentSpec = Parameters<typeof dressMannequin>[1];

/** Messages échangés entre le fil principal et le worker du mannequin (ajustement et habillage). */
export interface FitRequest {
  id: number;
  measurements: MeasurementSet;
  options?: FitOptions;
  /** Faux : ajustement de consultation, le worker ne retient pas ce corps pour l'habillage. */
  keep?: boolean;
}

/** Habiller le dernier corps ajusté (gardé par le worker) avec le patron. */
export interface DressRequest {
  kind: 'dress';
  id: number;
  spec: GarmentSpec;
  garment: { type: string };
  options?: DressOptions;
}

export type WorkerRequest = FitRequest | DressRequest;

export type FitResponse =
  { id: number; ok: true; mannequin: FittedMannequin } | { id: number; ok: false; message: string };

export type DressResponse =
  { id: number; ok: true; garment: GarmentMesh } | { id: number; ok: false; message: string };

export type WorkerResponse = FitResponse | DressResponse;

export interface HandledFit {
  response: FitResponse;
  /** Tampons à transférer (pas copier) avec la réponse. */
  transfer: ArrayBuffer[];
}

export interface HandledDress {
  response: DressResponse;
  transfer: ArrayBuffer[];
}

/** Ce que le worker retient entre deux messages : le dernier corps ajusté (copie, le tampon part au fil principal). */
export interface WorkerState {
  last?: FittedMannequin;
}

const unique = (buffers: ArrayBufferLike[]) =>
  [...new Set(buffers)].filter((b): b is ArrayBuffer => b instanceof ArrayBuffer);

/** Tampons du corps ajusté, sans doublon (deux tableaux peuvent partager un tampon). */
export function transferablesOf(mannequin: FittedMannequin): ArrayBuffer[] {
  const { positions, normals, index } = mannequin.body;
  return unique([positions.buffer, normals.buffer, index.buffer]);
}

/** Copie du corps : le worker garde la sienne quand l'original est transféré. */
function copyOf(mannequin: FittedMannequin): FittedMannequin {
  const { positions, normals, index } = mannequin.body;
  return {
    ...mannequin,
    body: { positions: positions.slice(), normals: normals.slice(), index: index.slice() },
  };
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Traite une demande d'ajustement : fonction pure (hors `state`), testable sans Worker. */
export function handleFitRequest(
  engine: MannequinEngine,
  request: FitRequest,
  state?: WorkerState,
): HandledFit {
  try {
    const mannequin = engine.fit(request.measurements, request.options);
    if (state && request.keep !== false) state.last = copyOf(mannequin);
    return {
      response: { id: request.id, ok: true, mannequin },
      transfer: transferablesOf(mannequin),
    };
  } catch (error) {
    return { response: { id: request.id, ok: false, message: messageOf(error) }, transfer: [] };
  }
}

/** Traite une demande d'habillage sur le dernier corps ajusté ; les tableaux du résultat sont transférés. */
export function handleDressRequest(state: WorkerState, request: DressRequest): HandledDress {
  try {
    if (!state.last) throw new Error('no mannequin fitted');
    const garment = dressMannequin(state.last, request.spec, request.garment, request.options);
    const { positions, normals, index } = garment;
    return {
      response: { id: request.id, ok: true, garment },
      transfer: unique([positions.buffer, normals.buffer, index.buffer]),
    };
  } catch (error) {
    return { response: { id: request.id, ok: false, message: messageOf(error) }, transfer: [] };
  }
}

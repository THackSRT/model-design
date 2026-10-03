import { ENGINE_VERSION, runCusickTest } from '@atelier/drape';
import type { CusickEdgeMm, FabricPhysics } from '@atelier/drape';

/** Demande d'essai de Cusick au worker : le tissu à simuler et, au besoin, la finesse du maillage. */
export interface CusickRequest {
  id: number;
  fabric: FabricPhysics;
  edgeMm?: CusickEdgeMm;
  /** Réduit le nombre de pas (tests seulement). */
  maxSteps?: number;
}

export interface CusickResponseResult {
  drapeCoefficient: number;
  converged: boolean;
  simulatedSteps: number;
  engineVersion: string;
}

export type CusickResponse =
  | { id: number; ok: true; result: CusickResponseResult; outlineMm: Float64Array }
  | { id: number; ok: false; message: string };

export interface HandledCusick {
  response: CusickResponse;
  /** Tampons à transférer (pas copier) avec la réponse. */
  transfer: ArrayBuffer[];
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Traite une demande d'essai : fonction pure, testable sans Worker. Un tissu invalide donne une réponse d'échec. */
export function handleCusickRequest(request: CusickRequest): HandledCusick {
  try {
    const { edgeMm, maxSteps } = request;
    const options = {
      ...(edgeMm === undefined ? {} : { edgeMm }),
      ...(maxSteps === undefined ? {} : { maxSteps }),
    };
    const { outlineMm, ...result } = runCusickTest(request.fabric, options);
    const buffer = outlineMm.buffer;
    return {
      response: {
        id: request.id,
        ok: true,
        result: { ...result, engineVersion: ENGINE_VERSION },
        outlineMm,
      },
      transfer: buffer instanceof ArrayBuffer ? [buffer] : [],
    };
  } catch (error) {
    return { response: { id: request.id, ok: false, message: messageOf(error) }, transfer: [] };
  }
}

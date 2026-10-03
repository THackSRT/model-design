import type { Drape, DrapeRequest } from '@atelier/contracts-ts';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import type { VersionRef } from '../cut-pieces/use-cut-pieces.js';

/** Intervalle d'interrogation d'un drapé en calcul (contrat : « toutes les 2 s »). */
export const DRAPE_POLL_MS = 2000;
/** Bras à l'horizontale (pose en T), en degrés depuis la verticale : avatar affiché et drapé (ADR 0018). */
export const DRAPE_ARM_ANGLE_DEG = 90;

export interface DrapeDeps {
  designs: DesignsClient;
}

/** Tissu demandé : celui du corps de `DrapeRequest`. */
export type DrapeFabric = DrapeRequest['fabric'];

export interface DrapeState {
  /** `failed` : le calcul a échoué (`problemType`) ; `error` : un appel HTTP a échoué (`problem`). */
  status: 'idle' | 'requesting' | 'pending' | 'completed' | 'failed' | 'error';
  drape?: Drape;
  /** Modèle glTF binaire, seulement une fois `completed`. */
  model?: ArrayBuffer;
  problemType?: NonNullable<Drape['problemType']>;
  problem?: ApiProblem;
  /** Faux sans version enregistrée ni tissu, ou pendant un calcul : l'action est désactivée. */
  canRequest: boolean;
}

export interface DrapeActions {
  request(): void;
}

/** Corps de la demande : toujours en brouillon (ADR 0013) ; le défaut du contrat est standard. */
export function drapeRequestBody(fabric: DrapeFabric): DrapeRequest {
  return { fabric, avatar: { armAngleDeg: DRAPE_ARM_ANGLE_DEG }, quality: 'draft' };
}

type Progress = Omit<DrapeState, 'canRequest'>;
type Report = (progress: Progress) => void;
const idle: Progress = { status: 'idle' };

const pause = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

/** Ce qu'un suivi partage : le client, la version, l'annulation et le compte rendu. */
interface Tracking {
  designs: DesignsClient;
  ref: VersionRef;
  live: () => boolean;
  report: Report;
}

async function readModel({ designs, ref, report }: Tracking, drape: Drape): Promise<void> {
  const model = await designs.getDrapeModel(ref.designId, ref.versionNumber, drape.id);
  report(
    model.isOk()
      ? { status: 'completed', drape, model: model.value }
      : { status: 'error', drape, problem: model.error },
  );
}

/** Suit le drapé jusqu'à sa fin, une interrogation à la fois ; `report` ignore l'appel d'un suivi annulé. */
async function follow(t: Tracking, first: Drape): Promise<void> {
  let drape = first;
  while (drape.status === 'pending') {
    t.report({ status: 'pending', drape });
    await pause(DRAPE_POLL_MS);
    if (!t.live()) return;
    const next = await t.designs.getDrape(t.ref.designId, t.ref.versionNumber, drape.id);
    if (!t.live()) return;
    if (next.isErr()) return t.report({ status: 'error', drape, problem: next.error });
    drape = next.value;
  }
  if (drape.status === 'failed') {
    t.report({ status: 'failed', drape, problemType: drape.problemType });
    return;
  }
  await readModel(t, drape);
}

/**
 * Drapé d'une version enregistrée : demande (`actions.request`), suivi jusqu'à `completed` ou
 * `failed`, lecture du modèle. Un changement de version ou de tissu, ou le démontage, annule tout.
 */
export function useDrape(
  deps: DrapeDeps,
  ref?: VersionRef,
  fabric?: DrapeFabric,
): { state: DrapeState; actions: DrapeActions } {
  const [progress, setProgress] = useState(idle);
  const cancel = useRef<() => void>(() => undefined);
  const { designs } = deps;
  const designId = ref?.designId;
  const versionNumber = ref?.versionNumber;
  const fabricKey = fabric && JSON.stringify(fabric);
  const busy = progress.status === 'requesting' || progress.status === 'pending';
  const canRequest = designId !== undefined && fabricKey !== undefined && !busy;
  useEffect(() => {
    setProgress(idle);
    return () => cancel.current();
  }, [designId, versionNumber, fabricKey]);
  const request = useCallback(() => {
    if (designId === undefined || versionNumber === undefined || fabricKey === undefined) return;
    if (busy) return;
    cancel.current();
    let alive = true;
    cancel.current = () => {
      alive = false;
    };
    const live = () => alive;
    const report: Report = (next) => live() && setProgress(next);
    const body = drapeRequestBody(JSON.parse(fabricKey) as DrapeFabric);
    setProgress({ status: 'requesting' });
    void designs.requestDrape(designId, versionNumber, body).then((result) => {
      if (!live()) return undefined;
      if (result.isErr()) return report({ status: 'error', problem: result.error });
      return follow({ designs, ref: { designId, versionNumber }, live, report }, result.value);
    });
  }, [designs, designId, versionNumber, fabricKey, busy]);
  return { state: { ...progress, canRequest }, actions: { request } };
}

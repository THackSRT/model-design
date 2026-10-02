import type { AvatarOptions, DrapeJob, DrapeRequest } from '@atelier/contracts-ts';
import type { DomainEvent, Id } from '@atelier/kernel';
import type { DesignId, OrganizationId } from './design.js';
import type { DesignVersion } from './design-version.js';
import { canonicalJson } from './fingerprint.js';

export type DrapeId = Id<'drape'>;

export type DrapeStatus = 'pending' | 'completed' | 'failed';

/** Un drapé encore en attente après ce délai se lit échoué (calculé à la lecture, rien n'est écrit). */
export const DRAPE_TIMEOUT_MS = 10 * 60 * 1000;
export const DRAPE_TIMEOUT_PROBLEM = '/problems/drape-timeout';

export interface DrapeEase {
  readonly minMm: number;
  readonly medianMm: number;
  readonly maxMm: number;
  readonly tightAreaMm2: number;
}

/** Une tâche de drapé suivie par le service. Le résultat est rempli par la consommation de drape.completed. */
export interface Drape {
  readonly id: DrapeId;
  readonly organizationId: OrganizationId;
  readonly designId: DesignId;
  readonly versionNumber: number;
  /** SHA-256 de la demande canonique : ni mesure ni patron, seulement tissu, avatar et finesse. */
  readonly requestFingerprint: string;
  readonly status: DrapeStatus;
  readonly problemType?: string;
  readonly ease?: DrapeEase;
  readonly maxStrainPercent?: number;
  readonly fabricEstimated?: boolean;
  readonly modelKey?: string;
  readonly createdAt: Date;
  readonly completedAt?: Date;
}

export interface DrapeRequested {
  drape: Drape;
  events: DomainEvent<DrapeJob>[];
}

/** Demande normalisée : les défauts du contrat sont appliqués avant l'empreinte (`{}` = avatar absent). */
export interface NormalizedDrapeRequest {
  fabric: DrapeRequest['fabric'];
  avatar: AvatarOptions;
  quality: 'draft' | 'standard';
}

export const normalizeRequest = (request: DrapeRequest): NormalizedDrapeRequest => ({
  fabric: request.fabric,
  avatar: request.avatar ?? {},
  quality: request.quality ?? 'standard',
});

export const requestCanonical = (request: NormalizedDrapeRequest): string => canonicalJson(request);

export interface NewDrape {
  id: DrapeId;
  organizationId: OrganizationId;
  version: DesignVersion;
  request: NormalizedDrapeRequest;
  requestFingerprint: string;
  now: Date;
}

/** Crée le drapé en attente et son événement `drape.requested` (la tâche porte les mesures de la version). */
export function requestDrape(input: NewDrape): DrapeRequested {
  const { version, request } = input;
  const drape: Drape = {
    id: input.id,
    organizationId: input.organizationId,
    designId: version.designId,
    versionNumber: version.number,
    requestFingerprint: input.requestFingerprint,
    status: 'pending',
    createdAt: input.now,
  };
  const event: DomainEvent<DrapeJob> = {
    type: 'drape.requested',
    subject: drape.id,
    data: {
      drapeId: drape.id,
      organizationId: input.organizationId,
      designId: version.designId,
      versionNumber: version.number,
      spec: version.spec,
      measurements: version.measurements,
      avatar: request.avatar,
      fabric: request.fabric,
      quality: request.quality,
    },
  };
  return { drape, events: [event] };
}

const isTimedOut = (drape: Drape, now: Date): boolean =>
  drape.status === 'pending' && now.getTime() - drape.createdAt.getTime() >= DRAPE_TIMEOUT_MS;

/** État tel qu'il se lit à `now` : un drapé en attente depuis 10 minutes est échoué (drape-timeout). */
export function readAt(drape: Drape, now: Date): Drape {
  return isTimedOut(drape, now)
    ? { ...drape, status: 'failed', problemType: DRAPE_TIMEOUT_PROBLEM }
    : drape;
}

/** Une même demande rend le drapé existant, sauf s'il a échoué (y compris par délai dépassé). */
export const isReusable = (drape: Drape, now: Date): boolean =>
  readAt(drape, now).status !== 'failed';

/** Indicateurs conservés d'un drapé réussi (le reste du résultat reste dans le fichier du modèle). */
export interface DrapeResultSummary {
  readonly modelKey: string;
  readonly ease: DrapeEase;
  readonly maxStrainPercent: number;
  readonly fabricEstimated: boolean;
}

/** Ce que le moteur annonce : drape.completed ou drape.failed. */
export type DrapeOutcome =
  | { readonly kind: 'completed'; readonly result: DrapeResultSummary }
  | { readonly kind: 'failed'; readonly problemType: string };

/**
 * Applique le résultat du moteur. Le premier résultat gagne : un drapé déjà terminé ne change plus (`undefined`).
 * Un drapé encore `pending` l'accepte même après 10 minutes : le délai (`readAt`) n'écrit rien, le résultat
 * tardif remplace donc le `drape-timeout` calculé à la lecture.
 */
export function settle(drape: Drape, outcome: DrapeOutcome, now: Date): Drape | undefined {
  if (drape.status !== 'pending') return undefined;
  return outcome.kind === 'completed'
    ? { ...drape, status: 'completed', ...outcome.result, completedAt: now }
    : { ...drape, status: 'failed', problemType: outcome.problemType, completedAt: now };
}

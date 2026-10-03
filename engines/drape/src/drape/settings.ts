import type { SimulationSettings } from '../core/types.js';
import type { MeshQuality } from '../mesh/limits.js';

/**
 * Réglages de la simulation selon la qualité (ADR 0013). Durée simulée : `maxSteps` / 60 s (6,7 s en brouillon,
 * 10 s en standard). Le temps de calcul est borné indirectement par `maxSteps` × `substeps` × nombre de sommets
 * (au plus 30 000) ; l'arrêt au repos (vitesse sous 1 mm/s pendant 10 pas) le raccourcit presque toujours.
 */
export const DRAPE_SETTINGS: Readonly<Record<MeshQuality, SimulationSettings>> & {
  /** Réglage fin d'un tube très évasé : remplace les sous-pas et les itérations de la qualité. */
  flare: Pick<SimulationSettings, 'substeps' | 'iterations'>;
} = {
  flare: { substeps: 50, iterations: 1 },
  draft: {
    stepS: 1 / 60,
    substeps: 10,
    sewingSteps: 30,
    maxSteps: 400,
    iterations: 4,
    holdReleaseSteps: 30,
    restSpeedMmPerS: 1,
  },
  standard: {
    stepS: 1 / 60,
    substeps: 10,
    sewingSteps: 45,
    maxSteps: 600,
    iterations: 6,
    holdReleaseSteps: 45,
    restSpeedMmPerS: 1,
  },
};

/** Borne dure de `maxSteps` demandé par l'appelant (1 000 pas = 16 s simulées). */
export const MAX_STEPS_LIMIT = 1000;

/** Écart de couture toléré après la simulation, mm (au-delà : `seam-not-closed`). */
export const SEAM_TOLERANCE_MM = 2;
/** Pénétration tolérée dans le corps après la simulation, mm (au-delà : `body-penetration`). */
export const PENETRATION_TOLERANCE_MM = 3;
/** Aisance au plus égale à cette valeur : tissu au contact du corps (marge de contact de 2 mm, plus 1 mm). */
export const TIGHT_EASE_MM = 3;

/** Rapport tour fini / courbe à partir duquel la simulation prend le réglage fin (tissu suspendu sans appui). */
export const FLARE_RATIO = 1.5;

/** Réglages de la qualité ; le réglage fin (`flare`) y remplace sous-pas et itérations si le départ a plissé un niveau d'au moins `FLARE_RATIO`. */
export function settingsFor(quality: MeshQuality, flareRatio: number): SimulationSettings {
  const base = { ...DRAPE_SETTINGS[quality] };
  return flareRatio >= FLARE_RATIO ? { ...base, ...DRAPE_SETTINGS.flare } : base;
}

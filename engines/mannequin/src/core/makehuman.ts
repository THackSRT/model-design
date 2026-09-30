/*
 * Mannequin réaliste : maillage MakeHuman (CC0) déformé par cibles de morphologie,
 * mesuré « au mètre ruban » et ajusté aux mesures du client.
 * Unités : cm, y vers le haut (pieds à 0), z vers l'avant.
 *
 * Façade : assemble les modules (mhz-data, morph, regions, measure, fit, pose, render). Reprise du
 * prototype (prototype/js/mh.js), ADR 0004 : toute modification passe par une relecture humaine.
 */
import { FIT_KEYS, fit } from './fit.js';
import { measure, ringPoints } from './measure.js';
import { gunzip, parse } from './mhz-data.js';
import { pose } from './pose.js';
import { buildRegions, trisToBase } from './regions.js';
import { renderGeometry } from './render.js';
import type {
  MakeHumanFit,
  MakeHumanGeometry,
  MakeHumanMeasuresCm,
  MakeHumanMorphology,
  Measured,
  MhModel,
} from './types.js';
import type { PoseResult } from './pose.js';

export type {
  MakeHumanFit,
  MakeHumanGeometry,
  MakeHumanMeasuresCm,
  MakeHumanMorphology,
  MakeHumanRing,
  Measured,
} from './types.js';

export interface MakeHuman {
  load(): Promise<MhModel>;
  ready(): boolean;
  fit(m: MakeHumanMeasuresCm, p: MakeHumanMorphology): MakeHumanFit;
  measure(pos: Float32Array, stature?: number | null): Measured;
  /** Triangles en sommets de base (globes oculaires compris, pièces détachées du corps). */
  baseTriangles(): Uint16Array;
  pose(pos: Float32Array, angle?: number): PoseResult;
  renderGeometry(pos: Float32Array, drop?: Uint8Array): MakeHumanGeometry;
  ringPoints: typeof ringPoints;
  FIT_KEYS: readonly string[];
}

/**
 * @param loadBytes rend les données MakeHuman compressées (gzip).
 */
export function createMakeHuman(loadBytes: () => Promise<Uint8Array>): MakeHuman {
  let model: MhModel | null = null;
  let loading: Promise<MhModel> | null = null;

  const loaded = (): MhModel => {
    if (!model) throw new Error("Données MakeHuman non chargées : appeler load() d'abord");
    return model;
  };

  const build = async (): Promise<MhModel> => {
    const data = parse(await gunzip(await loadBytes()));
    model = { ...data, regions: buildRegions(data), trisBase: trisToBase(data) };
    return model;
  };

  return {
    load() {
      if (model) return Promise.resolve(model);
      loading ??= build();
      return loading;
    },
    ready: () => model !== null,
    fit: (m, p) => fit(loaded(), m, p),
    measure: (pos, stature = null) => measure(loaded(), pos, stature),
    baseTriangles: () => loaded().trisBase,
    pose: (pos, angle) => pose(loaded(), pos, angle),
    renderGeometry: (pos, drop) => renderGeometry(loaded(), pos, drop),
    ringPoints,
    FIT_KEYS,
  };
}

// Types de la reprise du prototype (makehuman.js). Unités : cm, y vers le haut, z vers l'avant.
export interface MakeHumanMeasuresCm {
  stature: number;
  chest?: number;
  waist?: number;
  hip?: number;
  neck?: number;
  bicep?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
}

export interface MakeHumanMorphology {
  sex: 'femme' | 'homme';
  age?: number;
  muscle?: number;
  african?: number;
  asian?: number;
  caucasian?: number;
  belly?: number;
  seat?: number;
}

export interface MakeHumanRing {
  value: number;
  /** Centre de l'anneau de mesure (cm). */
  center: [number, number, number];
  side?: boolean;
}

export interface MakeHumanFit {
  pos: Float32Array;
  weight: number;
  muscle: number;
  measured: Record<string, number> & { rings: Record<string, MakeHumanRing> };
  err: number;
}

export interface MakeHumanGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  index: Uint32Array | Uint16Array;
}

export interface MakeHuman {
  load(): Promise<unknown>;
  fit(m: MakeHumanMeasuresCm, p: MakeHumanMorphology): MakeHumanFit;
  measure(pos: Float32Array, stature?: number): MakeHumanFit['measured'];
  /** Triangles en sommets de base (globes oculaires compris, pièces détachées du corps). */
  baseTriangles(): Uint16Array;
  pose(pos: Float32Array, angle?: number): { pos: Float32Array };
  renderGeometry(pos: Float32Array, drop?: Uint8Array): MakeHumanGeometry;
  FIT_KEYS: readonly string[];
}

export function createMakeHuman(loadBytes: () => Promise<Uint8Array>): MakeHuman;

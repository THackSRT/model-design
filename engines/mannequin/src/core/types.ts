/*
 * Types du moteur MakeHuman. Unités : cm, y vers le haut (pieds à 0), z vers l'avant.
 */

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

/** Mesures du client (cm). */
export interface MakeHumanMeasuresCm {
  stature: number;
  chest?: number;
  /** Tour sous la poitrine (cm), facultatif ; estimé pour une femme s'il manque. */
  underbust?: number;
  waist?: number;
  hip?: number;
  neck?: number;
  bicep?: number;
  wrist?: number;
  thigh?: number;
  knee?: number;
  calf?: number;
  ankle?: number;
  /** Hauteur d'entrejambe (cm), facultative. */
  crotch?: number;
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

/** Morphologie de base (« macros » MakeHuman) ; gender : 0 = femme, 1 = homme. */
export interface MacroParams {
  gender: number;
  age: number;
  muscle: number;
  weight: number;
  african: number;
  asian: number;
  caucasian: number;
}

export interface MakeHumanRing {
  value: number;
  /** Centre de l'anneau de mesure (cm). */
  center: Vec3;
  normal: Vec3;
  u: Vec3;
  w: Vec3;
  /** Enveloppe convexe de la coupe, dans le plan (u, w). */
  hull: Vec2[];
  /** Zone double (bras, jambes) mesurée côté gauche. */
  side: boolean;
}

/** Mesures du mannequin : tours par zone (cm), stature, entrejambe, anneaux de mesure. */
export type Measured = Record<string, number> & { rings: Record<string, MakeHumanRing> };

export interface MakeHumanFit {
  pos: Float32Array;
  weight: number;
  muscle: number;
  /** Valeurs des cibles de mensuration appliquées, par clé. */
  values: Record<string, number>;
  measured: Measured;
  err: number;
  worst: number;
}

export interface MakeHumanGeometry {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  index: Uint32Array | Uint16Array;
}

/** Cible de morphing : sommets touchés (idx) et déplacements quantifiés (d, 3 par sommet). */
export interface Target {
  idx: Uint16Array;
  d: Int16Array;
}

/** Poids de peau d'un bras : sommets (idx) et poids 0..255 (w). */
export interface ArmSkin {
  idx: Uint16Array;
  w: Uint8Array;
}

export interface MhHeader {
  nBase: number;
  nRender: number;
  nTris: number;
  targets: { name: string; n: number }[];
  arm: { L: number; R: number };
  joints: Record<string, number[]>;
  quant: number;
}

/** Données lues du fichier binaire. */
export interface MhData {
  header: MhHeader;
  base: Float32Array;
  uv: Float32Array;
  /** Sommet de base de chaque sommet de rendu. */
  rv2b: Uint16Array;
  /** Triangles en sommets de rendu. */
  tris: Uint16Array;
  targets: Record<string, Target>;
  arm: { L: ArmSkin; R: ArmSkin };
  joints: Record<string, number[]>;
  /** Pas de quantification des cibles. */
  q: number;
}

/** Zone de mesure : sommets de la cible de mensuration et bande du mètre ruban. */
export interface Region {
  verts: number[];
  band: number[];
  inRegion: Uint8Array;
}

/** Données lues, complétées des zones de mesure et des triangles en sommets de base. */
export interface MhModel extends MhData {
  regions: Record<string, Region>;
  trisBase: Uint16Array;
}

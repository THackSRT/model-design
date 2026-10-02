// Maillage de l'essai de drapé de Cusick simulé (ADR 0015) : éprouvette circulaire en anneaux concentriques
// sur un disque de support. Plan horizontal x–z, y vers le haut, mm.
import { CONTACT_MARGIN_MM } from '../core/constants.js';
import type { BodyMesh, ClothMesh, FabricPhysics, SimulationSettings } from '../core/types.js';

export const CUSICK_SPECIMEN_DIAMETER_MM = 300;
export const CUSICK_DISC_DIAMETER_MM = 180;

export type CusickEdgeMm = 5 | 7.5 | 10 | 15;

export interface CusickOptions {
  edgeMm?: CusickEdgeMm;
  maxSteps?: number;
}

export interface CusickTest {
  cloth: ClothMesh;
  body: BodyMesh;
  settings: SimulationSettings;
  specimenAreaMm2: number;
  discAreaMm2: number;
}

const DEFAULT_EDGE_MM = 7.5;
const DEFAULT_MAX_STEPS = 300;
const DISC_HEIGHT_MM = 20;
const DISC_SEGMENTS = 48;
/** Tolérance de comparaison des rayons (mm) pour les sommets fixes. */
const RADIUS_EPSILON_MM = 1e-9;

/** Indice du premier sommet de l'anneau k (l'anneau 0 est le centre). */
const ringStart = (k: number): number => (k === 0 ? 0 : 1 + 3 * k * (k - 1));

function ringTriangles(rings: number): number[] {
  const tris: number[] = [];
  for (let k = 1; k <= rings; k++) {
    const outer = ringStart(k);
    const inner = ringStart(k - 1);
    const outerCount = 6 * k;
    const innerCount = Math.max(1, 6 * (k - 1));
    for (let s = 0; s < 6; s++) {
      const o = (i: number): number => outer + ((s * k + i) % outerCount);
      const n = (i: number): number => inner + ((s * (k - 1) + i) % innerCount);
      for (let i = 0; i < k; i++) tris.push(n(i), o(i + 1), o(i));
      for (let i = 0; i < k - 1; i++) tris.push(n(i), n(i + 1), o(i + 1));
    }
  }
  return tris;
}

function buildSpecimen(fabric: FabricPhysics, edgeMm: number): ClothMesh {
  const rings = Math.round(CUSICK_SPECIMEN_DIAMETER_MM / 2 / edgeMm);
  const count = 1 + 3 * rings * (rings + 1);
  const positionsMm = new Float64Array(3 * count);
  const flatMm = new Float64Array(2 * count);
  const pinned: number[] = [];
  const startY = fabric.thicknessMm + CONTACT_MARGIN_MM;
  const pinRadius = CUSICK_DISC_DIAMETER_MM / 2 + RADIUS_EPSILON_MM;
  for (let k = 1; k <= rings; k++) {
    for (let j = 0; j < 6 * k; j++) {
      const a = (2 * Math.PI * j) / (6 * k);
      const index = ringStart(k) + j;
      flatMm[2 * index] = k * edgeMm * Math.cos(a);
      flatMm[2 * index + 1] = k * edgeMm * Math.sin(a);
      if (k * edgeMm <= pinRadius) pinned.push(index);
    }
  }
  pinned.push(0);
  const isPinned = new Set(pinned);
  for (let i = 0; i < count; i++) {
    positionsMm[3 * i] = flatMm[2 * i] as number;
    positionsMm[3 * i + 2] = flatMm[2 * i + 1] as number;
    // Perturbation déterministe des sommets libres, pour sortir de l'équilibre instable à plat.
    positionsMm[3 * i + 1] = startY + (isPinned.has(i) ? 0 : 0.25 * (((i * 7) % 5) - 2));
  }
  const triangles = Uint32Array.from(ringTriangles(rings));
  const grainUnit = new Float64Array((triangles.length / 3) * 2);
  for (let t = 0; t < triangles.length / 3; t++) grainUnit[2 * t] = 1;
  return {
    positionsMm,
    flatMm,
    triangles,
    grainUnit,
    stitches: new Uint32Array(0),
    pinned: Uint32Array.from(pinned.sort((a, b) => a - b)),
  };
}

/** Cylindre fermé : dessus à y = 0, normales vers l'extérieur (orientation corrigée triangle par triangle). */
function buildDisc(): BodyMesh {
  const radius = CUSICK_DISC_DIAMETER_MM / 2;
  const n = DISC_SEGMENTS;
  const pos: number[] = [0, 0, 0, 0, -DISC_HEIGHT_MM, 0];
  for (let layer = 0; layer < 2; layer++) {
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * j) / n;
      pos.push(radius * Math.cos(a), -layer * DISC_HEIGHT_MM, radius * Math.sin(a));
    }
  }
  const tris: number[] = [];
  for (let j = 0; j < n; j++) {
    const j2 = (j + 1) % n;
    const [t1, t2, b1, b2] = [2 + j, 2 + j2, 2 + n + j, 2 + n + j2];
    tris.push(0, t1, t2, 1, b1, b2, t1, b1, b2, t1, b2, t2);
  }
  return { positionsMm: Float64Array.from(pos), triangles: orientOutward(pos, tris) };
}

function orientOutward(pos: number[], tris: number[]): Uint32Array {
  const out = [...tris];
  const c = [0, -DISC_HEIGHT_MM / 2, 0];
  const p = (i: number, k: number): number => pos[3 * i + k] as number;
  for (let t = 0; t < out.length; t += 3) {
    const [a, b, d] = [out[t] as number, out[t + 1] as number, out[t + 2] as number];
    const u = [0, 1, 2].map((k) => p(b, k) - p(a, k));
    const v = [0, 1, 2].map((k) => p(d, k) - p(a, k));
    const nrm = [
      (u[1] as number) * (v[2] as number) - (u[2] as number) * (v[1] as number),
      (u[2] as number) * (v[0] as number) - (u[0] as number) * (v[2] as number),
      (u[0] as number) * (v[1] as number) - (u[1] as number) * (v[0] as number),
    ];
    let side = 0;
    for (let k = 0; k < 3; k++) {
      side += (nrm[k] as number) * ((p(a, k) + p(b, k) + p(d, k)) / 3 - (c[k] as number));
    }
    if (side < 0) {
      out[t + 1] = d;
      out[t + 2] = b;
    }
  }
  return Uint32Array.from(out);
}

function flatAreaMm2(cloth: ClothMesh): number {
  let area = 0;
  const q = (i: number, k: number): number => cloth.flatMm[2 * i + k] as number;
  for (let t = 0; t < cloth.triangles.length; t += 3) {
    const [a, b, c] = [
      cloth.triangles[t] as number,
      cloth.triangles[t + 1] as number,
      cloth.triangles[t + 2] as number,
    ];
    area +=
      Math.abs(
        (q(b, 0) - q(a, 0)) * (q(c, 1) - q(a, 1)) - (q(c, 0) - q(a, 0)) * (q(b, 1) - q(a, 1)),
      ) / 2;
  }
  return area;
}

/** Éprouvette de 300 mm sur disque de 180 mm, prête pour `simulate`. */
export function buildCusickTest(fabric: FabricPhysics, options: CusickOptions = {}): CusickTest {
  const cloth = buildSpecimen(fabric, options.edgeMm ?? DEFAULT_EDGE_MM);
  return {
    cloth,
    body: buildDisc(),
    settings: {
      stepS: 1 / 60,
      substeps: 20,
      sewingSteps: 0,
      maxSteps: options.maxSteps ?? DEFAULT_MAX_STEPS,
      restSpeedMmPerS: 1,
    },
    specimenAreaMm2: flatAreaMm2(cloth),
    discAreaMm2: Math.PI * (CUSICK_DISC_DIAMETER_MM / 2) ** 2,
  };
}

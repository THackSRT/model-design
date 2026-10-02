import type { BodyMesh, ClothMesh, FabricPhysics, SimulationSettings } from '../src/index.js';

export const FABRIC: FabricPhysics = {
  weightGPerM2: 150,
  thicknessMm: 0.3,
  stretchWarpPercent: 2,
  stretchWeftPercent: 3,
  bendingRigidityMicroNm: 8,
  frictionCoefficient: 0.4,
};

export const SETTINGS: SimulationSettings = {
  stepS: 1 / 60,
  substeps: 10,
  sewingSteps: 0,
  maxSteps: 60,
  restSpeedMmPerS: 1,
};

export type Vec3 = readonly [number, number, number];

const vec = (v: Vec3, k: number): number => v[k] as number;

export interface GridOptions {
  nx: number;
  ny: number;
  edgeMm: number;
  /** Position 3D du sommet de coordonnées à plat (u, v), en mm. */
  place: (u: number, v: number) => Vec3;
  /** Droit fil à plat : (1, 0) ou (0, 1). */
  grain?: readonly [number, number];
}

/** Grille de (nx+1) × (ny+1) sommets, deux triangles par case ; sommet (i, j) = i + j·(nx+1). */
export function gridCloth(o: GridOptions): ClothMesh {
  const w = o.nx + 1;
  const n = w * (o.ny + 1);
  const positionsMm = new Float64Array(3 * n);
  const flatMm = new Float64Array(2 * n);
  for (let j = 0; j <= o.ny; j++) {
    for (let i = 0; i <= o.nx; i++) {
      const v = i + j * w;
      const [x, y, z] = o.place(i * o.edgeMm, j * o.edgeMm);
      positionsMm.set([x, y, z], 3 * v);
      flatMm.set([i * o.edgeMm, j * o.edgeMm], 2 * v);
    }
  }
  const tris: number[] = [];
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const a = i + j * w;
      tris.push(a, a + 1, a + w + 1, a, a + w + 1, a + w);
    }
  }
  const grain = o.grain ?? [1, 0];
  const grainUnit = new Float64Array((tris.length / 3) * 2);
  for (let t = 0; t < tris.length / 3; t++) grainUnit.set(grain, 2 * t);
  return {
    positionsMm,
    flatMm,
    triangles: Uint32Array.from(tris),
    grainUnit,
    stitches: new Uint32Array(0),
  };
}

/** Triangles d'une bande équilatérale (voir `hexStripCloth`). */
function hexTriangles(cols: number, rows: number): number[] {
  const tris: number[] = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols - 1; i++) {
      const l = j * cols + i;
      const up = l + cols;
      if (j % 2 === 0) tris.push(l, l + 1, up);
      else tris.push(l, l + 1, up + 1, up, up + 1, l);
    }
    if (j % 2 === 0)
      for (let i = 1; i < cols; i++)
        tris.push(j * cols + i + cols - 1, j * cols + i + cols, j * cols + i);
  }
  return tris;
}

/**
 * Bande de triangles équilatéraux : `cols` sommets par rangée, rangées `rows + 1`, rangée j décalée d'une
 * demi-arête si j est impaire ; le sommet (i, j) porte le numéro j·cols + i. Coordonnées à plat : x = u, y = v.
 */
export function hexStripCloth(
  o: Omit<GridOptions, 'nx' | 'ny'> & { cols: number; rows: number },
): ClothMesh {
  const { cols, rows, edgeMm: h } = o;
  const n = cols * (rows + 1);
  const positionsMm = new Float64Array(3 * n);
  const flatMm = new Float64Array(2 * n);
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i < cols; i++) {
      const [u, v] = [i * h + (j % 2) * (h / 2), (j * h * Math.sqrt(3)) / 2];
      positionsMm.set(o.place(u, v), 3 * (j * cols + i));
      flatMm.set([u, v], 2 * (j * cols + i));
    }
  }
  const tris = hexTriangles(cols, rows);
  const grainUnit = new Float64Array((tris.length / 3) * 2);
  for (let t = 0; t < tris.length / 3; t++) grainUnit.set(o.grain ?? [1, 0], 2 * t);
  return {
    positionsMm,
    flatMm,
    triangles: Uint32Array.from(tris),
    grainUnit,
    stitches: new Uint32Array(0),
  };
}

/** Oriente chaque triangle vers l'extérieur d'un corps convexe de centre `center`. */
export function convexBody(positions: number[], triangles: number[], center: Vec3): BodyMesh {
  const tris = [...triangles];
  for (let t = 0; t < tris.length; t += 3) {
    const [a, b, c] = [tris[t] as number, tris[t + 1] as number, tris[t + 2] as number];
    const p = (i: number, k: number): number => positions[3 * i + k] as number;
    const u = [0, 1, 2].map((k) => p(b, k) - p(a, k)) as [number, number, number];
    const v = [0, 1, 2].map((k) => p(c, k) - p(a, k)) as [number, number, number];
    const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const out = [0, 1, 2].reduce(
      (s, k) =>
        s + (nrm[k] as number) * ((p(a, k) + p(b, k) + p(c, k)) / 3 - (center[k] as number)),
      0,
    );
    if (out < 0) {
      tris[t + 1] = c;
      tris[t + 2] = b;
    }
  }
  return { positionsMm: Float64Array.from(positions), triangles: Uint32Array.from(tris) };
}

export function sphereBody(center: Vec3, radiusMm: number, rings = 24, sectors = 48): BodyMesh {
  const pos: number[] = [];
  const tris: number[] = [];
  for (let r = 0; r <= rings; r++) {
    const phi = (Math.PI * r) / rings;
    for (let s = 0; s < sectors; s++) {
      const theta = (2 * Math.PI * s) / sectors;
      pos.push(
        center[0] + radiusMm * Math.sin(phi) * Math.cos(theta),
        center[1] + radiusMm * Math.cos(phi),
        center[2] + radiusMm * Math.sin(phi) * Math.sin(theta),
      );
    }
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sectors; s++) {
      const a = r * sectors + s;
      const b = r * sectors + ((s + 1) % sectors);
      tris.push(a, b, a + sectors, b, b + sectors, a + sectors);
    }
  }
  return convexBody(pos, tris, center);
}

/** Boîte (parallélépipède) définie par un coin d'origine et trois arêtes. */
export function boxBody(origin: Vec3, e1: Vec3, e2: Vec3, e3: Vec3): BodyMesh {
  const pos: number[] = [];
  for (let m = 0; m < 8; m++) {
    for (let k = 0; k < 3; k++) {
      pos.push(
        vec(origin, k) +
          (m & 1 ? vec(e1, k) : 0) +
          (m & 2 ? vec(e2, k) : 0) +
          (m & 4 ? vec(e3, k) : 0),
      );
    }
  }
  const quads = [
    [0, 1, 3, 2],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 3, 7, 5],
  ];
  const tris = quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d] as number[]);
  const center = [0, 1, 2].map(
    (k) => vec(origin, k) + (vec(e1, k) + vec(e2, k) + vec(e3, k)) / 2,
  ) as unknown as Vec3;
  return convexBody(pos, tris as number[], center);
}

export const NO_BODY: BodyMesh = {
  positionsMm: new Float64Array(0),
  triangles: new Uint32Array(0),
};

/**
 * Temps de calcul (CPU) de `fn`, en s. Les tests de performance mesurent le temps CPU du processus et non
 * l'horloge murale : sous charge (lint, build et autres fichiers de test en parallèle) l'horloge compte l'attente
 * du processeur, ce qui a fait échouer un seuil de 10 s sans changement de code. Vitest isole chaque fichier de test
 * dans son propre processus (pool `forks`), donc seul son propre calcul est compté.
 */
export function cpuSeconds(fn: () => void): number {
  const before = process.cpuUsage();
  fn();
  const used = process.cpuUsage(before);
  return (used.user + used.system) / 1e6;
}

export function sameBits(a: Float64Array, b: Float64Array): boolean {
  return Buffer.from(a.buffer).equals(Buffer.from(b.buffer));
}

/** Réunit deux tissus en un seul maillage, avec des coutures entre sommets (indices relatifs à chaque tissu). */
export function mergeCloths(
  a: ClothMesh,
  b: ClothMesh,
  pairs: ReadonlyArray<readonly [number, number]>,
): ClothMesh {
  const na = a.flatMm.length / 2;
  const cat = (x: Float64Array, y: Float64Array): Float64Array => Float64Array.from([...x, ...y]);
  return {
    positionsMm: cat(a.positionsMm, b.positionsMm),
    flatMm: cat(a.flatMm, b.flatMm),
    triangles: Uint32Array.from([...a.triangles, ...Array.from(b.triangles, (i) => i + na)]),
    grainUnit: cat(a.grainUnit, b.grainUnit),
    stitches: Uint32Array.from(pairs.flatMap(([i, j]) => [i, j + na])),
  };
}

import type { DrapeSuccess } from '../drape/drape-garment.js';
import type { GarmentPiece } from '../mesh/garment-mesh.js';

// Tableaux d'un exemplaire de pièce pour le glTF : indices locaux, mètres, normales calculées.
// Seule conversion mm → m du moteur : le glTF impose le mètre.

const MM_TO_M = 1 / 1000;

export interface PieceArrays {
  positions: Float32Array;
  normals: Float32Array;
  texcoords: Float32Array;
  easeMm: Float32Array;
  strain: Float32Array;
  indices: Uint32Array;
}

type Vec = [number, number, number];

function pointAt(p: Float32Array, i: number): Vec {
  return [p[i] as number, p[i + 1] as number, p[i + 2] as number];
}

/** Produit vectoriel des deux côtés du triangle (norme = double de l'aire). */
function faceNormal(p: Float32Array, a: number, b: number, c: number): Vec {
  const [ax, ay, az] = pointAt(p, a);
  const [ux, uy, uz] = [
    (p[b] as number) - ax,
    (p[b + 1] as number) - ay,
    (p[b + 2] as number) - az,
  ];
  const [vx, vy, vz] = [
    (p[c] as number) - ax,
    (p[c + 1] as number) - ay,
    (p[c + 2] as number) - az,
  ];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
}

/** Normales de sommet : somme des normales de face pondérées par l'aire, normalisée (0, 0, 1 si dégénérée). */
export function vertexNormals(positions: Float32Array, indices: Uint32Array): Float32Array {
  const acc = new Float64Array(positions.length);
  for (let t = 0; t < indices.length; t += 3) {
    const corners = [
      3 * (indices[t] as number),
      3 * (indices[t + 1] as number),
      3 * (indices[t + 2] as number),
    ] as const;
    const n = faceNormal(positions, corners[0], corners[1], corners[2]);
    for (const i of corners) {
      acc[i] = (acc[i] as number) + n[0];
      acc[i + 1] = (acc[i + 1] as number) + n[1];
      acc[i + 2] = (acc[i + 2] as number) + n[2];
    }
  }
  const out = new Float32Array(acc.length);
  for (let i = 0; i < acc.length; i += 3) {
    const len = Math.sqrt(
      (acc[i] as number) * (acc[i] as number) +
        (acc[i + 1] as number) * (acc[i + 1] as number) +
        (acc[i + 2] as number) * (acc[i + 2] as number),
    );
    if (len > 0) {
      out[i] = (acc[i] as number) / len;
      out[i + 1] = (acc[i + 1] as number) / len;
      out[i + 2] = (acc[i + 2] as number) / len;
    } else out[i + 2] = 1;
  }
  return out;
}

/**
 * Coordonnées de texture : le patron à plat en mètres, dans le repère de la pièce (x moins `shiftXMm`) ; une copie
 * miroir est retournée (x → −x) pour que le tissu se lise dans le même sens que sur la pièce dessinée.
 */
function texcoords(flatMm: Float64Array, piece: GarmentPiece): Float32Array {
  const out = new Float32Array(2 * piece.vertexCount);
  const sign = piece.mirrored ? -1 : 1;
  for (let v = 0; v < piece.vertexCount; v++) {
    const g = piece.vertexStart + v;
    out[2 * v] = sign * (((flatMm[2 * g] as number) - piece.shiftXMm) * MM_TO_M);
    out[2 * v + 1] = (flatMm[2 * g + 1] as number) * MM_TO_M;
  }
  return out;
}

function localIndices(triangles: Uint32Array, piece: GarmentPiece): Uint32Array {
  const from = 3 * piece.triangleStart;
  const out = new Uint32Array(3 * piece.triangleCount);
  for (let i = 0; i < out.length; i++) out[i] = (triangles[from + i] as number) - piece.vertexStart;
  return out;
}

export function pieceArrays(success: DrapeSuccess, piece: GarmentPiece): PieceArrays {
  const { vertexStart: start, vertexCount: count } = piece;
  const positions = new Float32Array(3 * count);
  for (let i = 0; i < positions.length; i++) {
    positions[i] = (success.positionsMm[3 * start + i] as number) * MM_TO_M;
  }
  const indices = localIndices(success.mesh.cloth.triangles, piece);
  return {
    positions,
    normals: vertexNormals(positions, indices),
    texcoords: texcoords(success.mesh.cloth.flatMm, piece),
    easeMm: success.easeMm.slice(start, start + count),
    strain: success.strain.slice(start, start + count),
    indices,
  };
}

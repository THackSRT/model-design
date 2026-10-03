/*
 * Maillage du vêtement : des tubes (suite d'anneaux de même nombre de sommets, du haut vers le bas)
 * en triangles, normales lissées tournées vers l'extérieur. Anneaux en cm, tableaux neufs.
 */
import { vertexNormals } from '../core/mesh.js';
import type { Vec2, Vec3 } from '../core/types.js';

/** Anneau à une hauteur (cm) : points (x, z) autour de l'axe vertical. */
export interface PlacedRing {
  yCm: number;
  points: Vec2[];
}

/** Anneau en plein espace (manche : plan perpendiculaire à l'axe du bras), points en cm. */
export interface SpatialRing {
  points3: Vec3[];
}

type AnyRing = PlacedRing | SpatialRing;

/** Suite d'anneaux de haut en bas ; `closed` : le dernier anneau est fermé par un disque. */
export interface Tube {
  rings: AnyRing[];
  closed: boolean;
}

export interface RawMesh {
  positions: Float32Array;
  normals: Float32Array;
  index: Uint32Array;
}

/** Sommets (x, y, z) d'un anneau, quel que soit son type. */
const vertices = (ring: AnyRing): Vec3[] =>
  'points3' in ring ? ring.points3 : ring.points.map((p): Vec3 => [p[0], ring.yCm, p[1]]);

const pointCount = (tubes: Tube[]): number =>
  tubes.reduce(
    (n, t) => n + t.rings.reduce((m, r) => m + vertices(r).length, 0) + (t.closed ? 1 : 0),
    0,
  );

/** Triangles d'un tube dont le premier sommet est `base` ; sens direct vu de l'extérieur. */
function tubeIndex(tube: Tube, base: number, out: number[]): void {
  const n = vertices(tube.rings[0] as AnyRing).length;
  for (let r = 0; r + 1 < tube.rings.length; r++) {
    for (let k = 0; k < n; k++) {
      const a = base + r * n + k;
      const b = base + r * n + ((k + 1) % n);
      out.push(a, b, a + n, b, b + n, a + n);
    }
  }
  if (!tube.closed) return;
  const last = base + (tube.rings.length - 1) * n;
  const centre = last + n;
  for (let k = 0; k < n; k++) out.push(centre, last + k, last + ((k + 1) % n));
}

export function buildMesh(tubes: Tube[]): RawMesh {
  const positions = new Float32Array(pointCount(tubes) * 3);
  const index: number[] = [];
  let v = 0;
  for (const tube of tubes) {
    if (tube.rings.length < 2) continue;
    tubeIndex(tube, v, index);
    for (const ring of tube.rings) {
      for (const p of vertices(ring)) positions.set(p, 3 * v++);
    }
    if (tube.closed) {
      const last = vertices(tube.rings[tube.rings.length - 1] as AnyRing);
      const mean = (q: 0 | 1 | 2): number => last.reduce((s, p) => s + p[q], 0) / last.length;
      positions.set([mean(0), (last[0] as Vec3)[1], mean(2)], 3 * v++);
    }
  }
  const tris = Uint32Array.from(index);
  return { positions, normals: vertexNormals(positions, tris), index: tris };
}

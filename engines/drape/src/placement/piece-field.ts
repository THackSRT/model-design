import type { Panel, Seam } from '@atelier/contracts-ts';
import type { GarmentMesh, GarmentPiece } from '../mesh/garment-mesh.js';
import { anchorLine, projectOnLine, type AnchorLine } from './anchor-line.js';
import { projectSmooth } from './line-projection.js';

// Repérage (s, d) des sommets d'un exemplaire de pièce par rapport à sa ligne d'ancrage, et longueurs de ses
// isolignes d (ADR 0013) : la longueur totale d'une isoligne donne le tour fini d'un tube à une hauteur ; la part de
// l'isoligne qui se projette sur la ligne d'ancrage même (hors prolongements en droite) donne le facteur d'échelle
// k(d) = longueur / longueur de la ligne, qui transforme l'abscisse s en abscisse sur la courbe d'enroulement.

/** Pas des isolignes échantillonnées, mm. */
const ISO_STEP_MM = 5;
/** Tolérance sur l'étendue de la ligne (arrondis des abscisses des bouts), mm. */
const RANGE_TOLERANCE = 1e-3;
/** Tolérance sur le bord de la pièce en d, mm. */
const EDGE_TOLERANCE = 1e-3;

// Lecture sans vérification d'indice : les tableaux typés sont dimensionnés par construction.
const f = (a: Float64Array, i: number): number => a[i] as number;

export interface PieceField {
  line: AnchorLine;
  /** Par sommet de l'exemplaire (indice local) : abscisse et distance signée (positive vers le bas). */
  s: Float64Array;
  d: Float64Array;
  /** Longueur totale de l'isoligne d (mm), 0 hors de la pièce. */
  fullLength(d: number): number;
  /** k(d) : longueur de la part de l'isoligne qui se projette sur la ligne, sur la longueur de la ligne. */
  scale(d: number): number;
  /** Abscisse sur la courbe d'enroulement du point (s, d) : s × k(d) dans l'étendue de la ligne, s au-delà. */
  abscissa(s: number, d: number): number;
  /** Étendue [s min, s max] de l'isoligne d (0, 0 hors de la pièce). */
  span(d: number): readonly [number, number];
  /**
   * Abscisse lissée par sommet (mesurée sur la courbe parallèle à la ligne : sans plateau dans le coin d'un sommet de
   * la chaîne) et étendue de l'isoligne d dans cette abscisse. Sert au départ en godets.
   */
  t: Float64Array;
  tSpan(d: number): readonly [number, number];
}

/** Longueurs des isolignes aux niveaux `first + i` pas : totale, et part dans l'étendue de la ligne. */
interface Samples {
  first: number;
  /** Étendue de d dans la pièce : hors de cette étendue il n'y a pas d'isoligne. */
  dMin: number;
  dMax: number;
  full: Float64Array;
  inside: Float64Array;
  /** Plus petit et plus grand s de l'isoligne à chaque niveau (±Infinity sans isoligne). */
  sLow: Float64Array;
  sHigh: Float64Array;
}

/** Valeur interpolée au niveau d ; 0 hors de la pièce, bornée aux niveaux échantillonnés au bord. */
function interpolate(values: Float64Array, samples: Samples, d: number): number {
  if (d < samples.dMin - EDGE_TOLERANCE || d > samples.dMax + EDGE_TOLERANCE) return 0;
  const lowest = Math.ceil(samples.dMin / ISO_STEP_MM - 1e-9) - samples.first;
  const highest = Math.max(lowest, Math.floor(samples.dMax / ISO_STEP_MM + 1e-9) - samples.first);
  const x = Math.max(lowest, Math.min(highest, d / ISO_STEP_MM - samples.first));
  const i = Math.min(Math.floor(x), values.length - 1);
  const a = f(values, i);
  const b = i + 1 < values.length ? f(values, i + 1) : a;
  return a + (b - a) * (x - i);
}

interface Corner {
  x: number;
  y: number;
  s: number;
  d: number;
}

/** Point de l'arête p→q où d vaut c. */
function cross(p: Corner, q: Corner, c: number): Corner {
  const span = q.d - p.d;
  const t = span === 0 ? 0 : (c - p.d) / span;
  return { x: p.x + t * (q.x - p.x), y: p.y + t * (q.y - p.y), s: p.s + t * (q.s - p.s), d: c };
}

function addIsoline(samples: Samples, k: number, corners: Corner[], range: [number, number]): void {
  const [a, b, c] = corners as [Corner, Corner, Corner];
  const level = k * ISO_STEP_MM;
  if (c.d === a.d) return;
  const p = cross(a, c, level);
  const q = level < b.d ? cross(a, b, level) : cross(b, c, level);
  const length = Math.sqrt((p.x - q.x) * (p.x - q.x) + (p.y - q.y) * (p.y - q.y));
  const i = k - samples.first;
  samples.full[i] = f(samples.full, i) + length;
  samples.inside[i] = f(samples.inside, i) + length * insideFraction(p.s, q.s, range);
  samples.sLow[i] = Math.min(f(samples.sLow, i), p.s, q.s);
  samples.sHigh[i] = Math.max(f(samples.sHigh, i), p.s, q.s);
}

/** Étendue en s de l'isoligne d : interpolée entre les deux niveaux échantillonnés voisins, sinon le plus proche. */
function spanAt(samples: Samples, d: number): readonly [number, number] {
  if (d < samples.dMin - EDGE_TOLERANCE || d > samples.dMax + EDGE_TOLERANCE) return [0, 0];
  const last = samples.sLow.length - 1;
  const x = Math.max(0, Math.min(last, d / ISO_STEP_MM - samples.first));
  const i = Math.min(Math.floor(x), last);
  const t = x - i;
  const has = (k: number): boolean => k <= last && f(samples.sLow, k) <= f(samples.sHigh, k);
  if (has(i) && has(i + 1)) {
    return [
      f(samples.sLow, i) + t * (f(samples.sLow, i + 1) - f(samples.sLow, i)),
      f(samples.sHigh, i) + t * (f(samples.sHigh, i + 1) - f(samples.sHigh, i)),
    ];
  }
  for (let k = 0; k <= last; k++) {
    for (const j of [i - k, i + 1 + k]) {
      if (j >= 0 && has(j)) return [f(samples.sLow, j), f(samples.sHigh, j)];
    }
  }
  return [0, 0];
}

/**
 * Dernier niveau où l'étendue de l'isoligne se lit : dans le dernier pas avant le bord bas (l'ourlet, coupé en oblique
 * par les isolignes) elle ne tient qu'à quelques triangles du maillage, qui n'est pas le même pour deux pièces miroirs.
 */
const hemEnd = (samples: Samples): number => Math.max(samples.dMin, samples.dMax - ISO_STEP_MM);

/** Part (0 à 1) du segment de s = a à s = b dont l'abscisse est dans l'étendue de la ligne. */
function insideFraction(a: number, b: number, range: [number, number]): number {
  const lo = range[0] - RANGE_TOLERANCE;
  const hi = range[1] + RANGE_TOLERANCE;
  const span = b - a;
  if (Math.abs(span) < 1e-9) return a >= lo && a <= hi ? 1 : 0;
  const [t0, t1] = [(lo - a) / span, (hi - a) / span];
  return Math.max(0, Math.min(1, Math.max(t0, t1)) - Math.max(0, Math.min(t0, t1)));
}

/** Les trois coins du triangle t, par d croissant. */
function cornersOf(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  coords: { s: Float64Array; d: Float64Array },
  t: number,
): Corner[] {
  const corners = [0, 1, 2].map((j) => {
    const v = mesh.cloth.triangles[3 * t + j] as number;
    const local = v - piece.vertexStart;
    return {
      x: f(mesh.cloth.flatMm, 2 * v),
      y: f(mesh.cloth.flatMm, 2 * v + 1),
      s: f(coords.s, local),
      d: f(coords.d, local),
    };
  });
  return corners.sort((p, q) => p.d - q.d);
}

function sampleIsolines(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  coords: { s: Float64Array; d: Float64Array },
  range: [number, number],
): Samples {
  const lo = coords.d.reduce((m, v) => Math.min(m, v), Infinity);
  const hi = coords.d.reduce((m, v) => Math.max(m, v), -Infinity);
  const first = Math.floor(lo / ISO_STEP_MM);
  const size = Math.max(1, Math.ceil(hi / ISO_STEP_MM) - first + 2);
  const samples: Samples = {
    first,
    dMin: lo,
    dMax: hi,
    full: new Float64Array(size),
    inside: new Float64Array(size),
    sLow: new Float64Array(size).fill(Infinity),
    sHigh: new Float64Array(size).fill(-Infinity),
  };
  for (let t = piece.triangleStart; t < piece.triangleStart + piece.triangleCount; t++) {
    const corners = cornersOf(mesh, piece, coords, t);
    const from = Math.ceil((corners[0] as Corner).d / ISO_STEP_MM);
    const to = Math.floor((corners[2] as Corner).d / ISO_STEP_MM);
    for (let k = from; k <= to; k++) addIsoline(samples, k, corners, range);
  }
  return samples;
}

/** (s, d) et abscisse lissée de chaque sommet de l'exemplaire par rapport à sa ligne d'ancrage. */
function project(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  line: AnchorLine,
): { s: Float64Array; d: Float64Array; smooth: Float64Array } {
  const s = new Float64Array(piece.vertexCount);
  const d = new Float64Array(piece.vertexCount);
  const smooth = new Float64Array(piece.vertexCount);
  const out = new Float64Array(2);
  for (let i = 0; i < piece.vertexCount; i++) {
    const [x, y] = [
      f(mesh.cloth.flatMm, 2 * (piece.vertexStart + i)),
      f(mesh.cloth.flatMm, 2 * (piece.vertexStart + i) + 1),
    ];
    projectOnLine(line, x, y, out);
    s[i] = f(out, 0);
    d[i] = f(out, 1);
    projectSmooth(line, x, y, out);
    smooth[i] = f(out, 0);
  }
  return { s, d, smooth };
}

/** Repère de l'exemplaire, ou `undefined` si sa ligne d'ancrage n'existe pas (contour vide). */
export function pieceField(
  mesh: GarmentMesh,
  piece: GarmentPiece,
  panel: Panel,
  seams: readonly Seam[],
): PieceField | undefined {
  const line = anchorLine(mesh, piece, panel, seams);
  if (!line || line.length <= 0) return undefined;
  const { s, d, smooth } = project(mesh, piece, line);
  const range = line.range;
  const samples = sampleIsolines(mesh, piece, { s, d }, range);
  const smoothSamples = sampleIsolines(mesh, piece, { s: smooth, d }, range);
  const scale = (dd: number): number => {
    const k = interpolate(samples.inside, samples, dd) / (range[1] - range[0]);
    return k > 0 ? k : 1;
  };
  return {
    line,
    s,
    d,
    fullLength: (dd) => interpolate(samples.full, samples, dd),
    span: (dd) =>
      spanAt(samples, dd > samples.dMax + EDGE_TOLERANCE ? dd : Math.min(dd, hemEnd(samples))),
    t: smooth,
    tSpan(dd) {
      // L'isoligne de la ligne même (d ≈ 0) se confond avec le bord : ses extrémités se prolongent depuis deux niveaux.
      if (dd >= ISO_STEP_MM) return spanAt(smoothSamples, dd);
      const [a, b] = [spanAt(smoothSamples, ISO_STEP_MM), spanAt(smoothSamples, 2 * ISO_STEP_MM)];
      const w = (dd - ISO_STEP_MM) / ISO_STEP_MM;
      return [a[0] + (b[0] - a[0]) * w, a[1] + (b[1] - a[1]) * w];
    },
    scale,
    abscissa(sv, dd) {
      const inside = Math.max(range[0], Math.min(range[1], sv));
      return inside * scale(dd) + (sv - inside);
    },
  };
}

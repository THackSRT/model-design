/*
 * Visage de mannequin : la tête MakeHuman garde sa forme (crâne, joues, mâchoire, menton, oreilles),
 * seuls les traits du visage (yeux, sourcils, nez, bouche) sont effacés.
 * La zone des traits est dépliée à plat (plongement de Tutte : les replis de la bouche et des paupières
 * s'étalent sans se chevaucher), puis posée sur la surface la plus lisse qui prolonge la peau autour
 * (spline de plaque mince). Unités : cm, y vers le haut, z vers l'avant ; topologie de base.
 */
import { add, at, flood, neighbours, rings, taubin, vertexNormals } from './mesh.js';
import { solveThinPlate, type ThinPlate } from './thin-plate.js';

export interface PlainFace {
  /** Positions des sommets de base, visage sans traits. */
  pos: Float32Array;
  /** 1 pour les sommets à ne pas afficher (globes oculaires). */
  drop: Uint8Array;
}

interface Eyes {
  center: [number, number, number];
  /** Écart entre les centres des yeux. */
  spread: number;
}

const FLATTEN_PASSES = 1500;
/** Surrelaxation du dépliage : converge plus vite, même résultat. */
const OVER_RELAX = 1.8;
const SUPPORT_RINGS = 10;
const BLEND_RINGS = 4;
const BLEND_PASSES = 20;
/** Une peau d'appui regarde vers l'avant (composante z de la normale). */
const FRONT_FACING = 0.35;

/** Globes oculaires : les pièces détachées de plus d'un sommet, au-dessus du cou. */
function eyeballs(adj: number[][], pos: Float32Array, neckY: number): number[][] {
  const taken = new Uint8Array(adj.length);
  const parts: number[][] = [];
  for (let v = 0; v < adj.length; v++) {
    if (taken[v] || at(pos, 3 * v + 1) <= neckY) continue;
    const part = flood(adj, [v], () => true);
    for (const w of part) taken[w] = 1;
    if (part.length > 1 && part.length < adj.length / 10) parts.push(part);
  }
  return parts;
}

function centroid(pos: ArrayLike<number>, verts: number[]): [number, number, number] {
  const c: [number, number, number] = [0, 0, 0];
  for (const v of verts) for (let q = 0; q < 3; q++) add(c, q, at(pos, 3 * v + q) / verts.length);
  return c;
}

/** Repères du visage : centre des deux globes oculaires et leur écart. */
function locateEyes(pos: Float32Array, balls: number[][]): Eyes {
  const eyes = balls.map((ball) => centroid(pos, ball)).sort((a, b) => a[0] - b[0]);
  const [left, right] = eyes;
  if (eyes.length !== 2 || !left || !right) throw new Error('Yeux introuvables sur le maillage');
  return { center: centroid([...left, ...right], [0, 1]), spread: Math.abs(right[0] - left[0]) };
}

/** Superellipse (exposant 3) de centre (cx, cy) et de demi-axes (ax, ay), vue de face. */
function inBlob(x: number, y: number, [cx, cy, ax, ay]: [number, number, number, number]): boolean {
  return Math.abs((x - cx) / ax) ** 3 + Math.abs((y - cy) / ay) ** 3 < 1;
}

/**
 * Traits du visage vus de face, en proportion de l'écart des yeux d : yeux et sourcils, nez, bouche.
 * Joues, front, menton, mâchoire et oreilles restent dehors : ils portent la surface de remplacement.
 */
function inFeatures(pos: Float32Array, eyes: Eyes, v: number): boolean {
  const [ex, ey] = eyes.center;
  const d = eyes.spread;
  const blobs: [number, number, number, number][] = [
    [ex - 0.5 * d, ey + 0.06 * d, 0.5 * d, 0.4 * d],
    [ex + 0.5 * d, ey + 0.06 * d, 0.5 * d, 0.4 * d],
    [ex, ey - 0.45 * d, 0.4 * d, 0.55 * d],
    [ex, ey - 1.08 * d, 0.62 * d, 0.36 * d],
  ];
  return blobs.some((blob) => inBlob(at(pos, 3 * v), at(pos, 3 * v + 1), blob));
}

/** Sommet le plus avancé sur l'axe q (0 : x, 1 : y, 2 : z) parmi ceux retenus. */
function extreme(pos: Float32Array, q: number, keep: (v: number) => boolean): number {
  let best = -1;
  for (let v = 0; v < pos.length / 3; v++) {
    if (keep(v) && (best < 0 || at(pos, 3 * v + q) > at(pos, 3 * best + q))) best = v;
  }
  return best;
}

/**
 * Zone à effacer : les traits reliés au bout du nez, plus tout ce qu'ils enferment (intérieur de la
 * bouche, fond des orbites), c'est-à-dire ce qu'on ne peut plus rejoindre depuis le sommet du crâne.
 */
function faceZone(pos: Float32Array, adj: number[][], eyes: Eyes, drop: Uint8Array): number[] {
  const inside = (v: number) => !drop[v] && inFeatures(pos, eyes, v);
  const zone = new Uint8Array(adj.length);
  for (const v of flood(adj, [extreme(pos, 2, inside)], inside)) zone[v] = 1;
  const outer = new Uint8Array(adj.length);
  const crown = extreme(pos, 1, (v) => !drop[v]);
  for (const v of flood(adj, [crown], (w) => !zone[w] && !drop[w])) outer[v] = 1;
  return [...zone.keys()].filter((v) => !outer[v] && !drop[v] && adj[v]?.length);
}

/**
 * Peau d'appui : les rangées de sommets autour de la zone, tournées vers l'avant ; toute la première
 * (raccord sans cassure), une sur quatre au-delà (forme générale des joues, du front et du menton).
 */
function supportSkin(pos: Float32Array, nor: Float32Array, adj: number[][], zone: number[]) {
  return rings(adj, zone, SUPPORT_RINGS)
    .flatMap((ring, r) => ring.filter((v, k) => r === 0 || k % 4 === 0))
    .filter((v) => at(nor, 3 * v + 2) > FRONT_FACING)
    .map((v): [number, number, number] => [at(pos, 3 * v), at(pos, 3 * v + 1), at(pos, 3 * v + 2)]);
}

/** Plongement de Tutte : chaque sommet du visage au barycentre de ses voisins, bord fixe (x, y). */
function flatten(pos: Float32Array, adj: number[][], free: number[]): Float32Array {
  const uv = Float32Array.from({ length: (pos.length / 3) * 2 }, (_, i) =>
    at(pos, 3 * (i >> 1) + (i & 1)),
  );
  for (let pass = 0; pass < FLATTEN_PASSES; pass++) {
    for (const v of free) for (let q = 0; q < 2; q++) relax(uv, adj[v] ?? [], 2 * v + q);
  }
  return uv;
}

/** Rapproche la coordonnée i (u ou v) de la moyenne de celle des voisins (boucle chaude : accès directs). */
function relax(uv: Float32Array, nb: number[], i: number): void {
  const q = i & 1;
  let s = 0;
  for (const w of nb) s += uv[2 * w + q] as number;
  const cur = uv[i] as number;
  uv[i] = cur + OVER_RELAX * (s / nb.length - cur);
}

function place(pos: Float32Array, free: number[], uv: Float32Array, surface: ThinPlate) {
  const out = Float32Array.from(pos);
  for (const v of free) {
    const x = at(uv, 2 * v);
    const y = at(uv, 2 * v + 1);
    out.set([x, y, surface(x, y)], 3 * v);
  }
  return out;
}

/**
 * Efface les traits du visage d'un corps ajusté.
 * @param pos sommets de base (cm) ; @param tris triangles de base ; @param neckY hauteur du tour de cou.
 */
export function plainFace(pos: Float32Array, tris: ArrayLike<number>, neckY: number): PlainFace {
  const adj = neighbours(tris, pos.length / 3);
  const balls = eyeballs(adj, pos, neckY);
  const drop = new Uint8Array(adj.length);
  for (const v of balls.flat()) drop[v] = 1;
  const zone = faceZone(pos, adj, locateEyes(pos, balls), drop);
  const surface = solveThinPlate(supportSkin(pos, vertexNormals(pos, tris), adj, zone));
  const out = place(pos, zone, flatten(pos, adj, zone), surface);
  const inZone = new Uint8Array(adj.length);
  for (const v of zone) inZone[v] = 1;
  const edge = zone.filter((v) => (adj[v] ?? []).some((w) => !inZone[w]));
  const band = [...edge, ...rings(adj, edge, BLEND_RINGS, (v) => !!drop[v]).flat()];
  taubin(out, adj, band, BLEND_PASSES);
  return { pos: out, drop };
}

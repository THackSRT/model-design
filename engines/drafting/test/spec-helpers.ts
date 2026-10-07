import { garmentSpecJsonSchema } from '@atelier/contracts-ts';
import type { Edge, GarmentSpec, Panel, Point, Seam } from '@atelier/contracts-ts';
import { Ajv2020 } from 'ajv/dist/2020.js';
import addFormatsModule from 'ajv-formats';
import { draftModel, toGarmentSpec } from '../src/index.js';
import type { DraftOptions, DraftedPart, PointMm, SizeName } from '../src/index.js';
import { sizeRequest } from './helpers.js';

// Valideur du schéma GarmentSpec du dépôt, tel que `@atelier/contracts-ts` le publie (même réglage que le service-kit).
const addFormats = ((addFormatsModule as unknown as { default?: unknown }).default ??
  addFormatsModule) as (ajv: Ajv2020) => void;
const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
const validateSchema = ajv.compile(garmentSpecJsonSchema);

/** Côté, épaule et dessous de bras : FreeSewing les dimensionne l'un sur l'autre, 0,000 mm d'écart sur toutes les tailles. */
export const EXACT_MM = 0.01;
/** FreeSewing ajuste la tête de manche à 2 mm au plus de la longueur qu'il vise ; 0,05 mm de marge d'arrondi et de mesure. */
export const FIT_MM = 2.05;
/** Clé du magasin de FreeSewing qui donne la longueur visée pour la tête de manche (`DraftResult.values`). */
export const TARGET_KEY = 'library.sleeve.sleevecapTarget';

/** GarmentSpec de Brian pour une taille et des options. */
export const specOf = (size: SizeName, options: DraftOptions = {}): GarmentSpec =>
  toGarmentSpec(draftModel(sizeRequest(size, options)));

/** Les coutures de la tête de manche contre les emmanchures (`armhole-<rang>`). */
export const armholeSeams = (spec: GarmentSpec): Seam[] =>
  spec.seams.filter((seam) => seam.id.startsWith('armhole'));

/** Erreurs du schéma GarmentSpec pour une valeur : liste vide si elle est valide. */
export function schemaErrors(spec: unknown): string[] {
  if (validateSchema(spec)) return [];
  return (validateSchema.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? ''}`);
}

/** Nombre de points de l'échantillonnage d'un bord : la longueur d'une courbe en est à moins de 1e-4 mm. */
const SAMPLES = 2000;

/** Points d'un bord, droite ou courbe de Bézier cubique, échantillonnés finement. */
export function flatten(edge: Edge, samples = SAMPLES): Point[] {
  const { from, to } = edge;
  const controls = edge.controls ?? [];
  const points: Point[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    if (controls.length === 2) {
      const [c1, c2] = controls as [Point, Point];
      const [w0, w1, w2, w3] = [(1 - t) ** 3, 3 * (1 - t) ** 2 * t, 3 * (1 - t) * t * t, t ** 3];
      points.push([
        w0 * from[0] + w1 * c1[0] + w2 * c2[0] + w3 * to[0],
        w0 * from[1] + w1 * c1[1] + w2 * c2[1] + w3 * to[1],
      ]);
    } else {
      points.push([from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t]);
    }
  }
  return points;
}

/** Contour d'une pièce tracée vu dans le repère de GarmentSpec (y vers le haut), les courbes échantillonnées finement. */
export function tracedPolyline(part: DraftedPart, samples = 400): Point[] {
  const { vertices, segments } = part.contour;
  const flip = (point: PointMm): Point => [point.xMm, -point.yMm];
  return segments.flatMap((segment) => {
    const controls: [Point, Point] | undefined =
      segment.cp1 && segment.cp2 ? [flip(segment.cp1), flip(segment.cp2)] : undefined;
    const edge: Edge = {
      id: 'draft',
      from: flip(vertices[segment.from] as PointMm),
      to: flip(vertices[segment.to] as PointMm),
      ...(controls === undefined ? {} : { controls }),
    };
    return flatten(edge, samples);
  });
}

const gap = (p: Point, q: Point): number => Math.sqrt((p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2);

/** Longueur d'un bord mesurée sur la polyligne échantillonnée : indépendante du moteur. */
export function lengthOfEdge(edge: Edge): number {
  const points = flatten(edge);
  let total = 0;
  for (let i = 1; i < points.length; i++) total += gap(points[i - 1] as Point, points[i] as Point);
  return total;
}

export const edgeOf = (spec: GarmentSpec, panelId: string, edgeId: string): Edge =>
  (spec.panels.find((panel) => panel.id === panelId) as Panel).edges.find(
    (edge) => edge.id === edgeId,
  ) as Edge;

/** Les deux bords d'une couture. */
export const sidesOf = (spec: GarmentSpec, seam: Seam): [Edge, Edge] => [
  edgeOf(spec, seam.a.panelId, seam.a.edgeId),
  edgeOf(spec, seam.b.panelId, seam.b.edgeId),
];

/** Aire signée du contour d'une pièce (courbes échantillonnées) : positive si trigonométrique, y vers le haut. */
export function signedAreaOf(panel: Panel): number {
  const polygon = panel.edges.flatMap((edge) => flatten(edge, 32).slice(0, -1));
  let twice = 0;
  polygon.forEach((p, i) => {
    const q = polygon[(i + 1) % polygon.length] as Point;
    twice += p[0] * q[1] - q[0] * p[1];
  });
  return twice / 2;
}

/** Distance d'un point à la polyligne la plus proche (segments, pas seulement sommets). */
export function distanceToPolyline(point: Point, line: readonly Point[]): number {
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1] as Point;
    const b = line[i] as Point;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const span = dx * dx + dy * dy;
    const t =
      span === 0
        ? 0
        : Math.min(1, Math.max(0, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / span));
    best = Math.min(best, gap(point, [a[0] + t * dx, a[1] + t * dy]));
  }
  return best;
}

/** Longueur d'une liste de bords bout à bout. */
export const totalLength = (edges: readonly Edge[]): number =>
  edges.reduce((sum, edge) => sum + lengthOfEdge(edge), 0);

/**
 * Défauts de structure d'une GarmentSpec que le schéma ne dit pas : contours fermés et trigonométriques, identifiants
 * uniques, pli droit sur l'axe, coutures qui visent des bords existants (chacun dans une couture au plus), crans sur le
 * bord de leur pièce, pose présente. Liste vide si tout va bien.
 */
export function structureProblems(spec: GarmentSpec): string[] {
  const problems: string[] = [];
  for (const panel of spec.panels) {
    panel.edges.forEach((edge, i) => {
      const next = panel.edges[(i + 1) % panel.edges.length] as Edge;
      if (gap(edge.to, next.from) > 1e-6)
        problems.push(`${panel.id}: ${edge.id} ne rejoint pas ${next.id}`);
    });
    if (!(signedAreaOf(panel) > 0))
      problems.push(`${panel.id}: contour hors du sens trigonométrique`);
    const ids = panel.edges.map((edge) => edge.id);
    if (new Set(ids).size !== ids.length)
      problems.push(`${panel.id}: identifiants de bords en double`);
    problems.push(...foldProblems(panel), ...notchProblems(panel));
    if (panel.placement === undefined) problems.push(`${panel.id}: pas de pose`);
  }
  problems.push(...seamProblems(spec));
  return problems;
}

function foldProblems(panel: Panel): string[] {
  const folds = panel.edges.filter((edge) => edge.role === 'fold');
  if (panel.cutOnFold !== true)
    return folds.length > 0 ? [`${panel.id}: pli sur une pièce non pliée`] : [];
  const [fold] = folds;
  if (folds.length !== 1 || fold === undefined) return [`${panel.id}: un seul bord de pli attendu`];
  const straight = (fold.controls?.length ?? 0) === 0;
  return straight && fold.from[0] === 0 && fold.to[0] === 0
    ? []
    : [`${panel.id}: pli non droit ou hors de l'axe`];
}

function notchProblems(panel: Panel): string[] {
  const problems: string[] = [];
  for (const notch of panel.notches ?? []) {
    const edge = panel.edges.find((candidate) => candidate.id === notch.edgeId);
    if (edge === undefined) problems.push(`${panel.id}: cran sur un bord inconnu ${notch.edgeId}`);
    else if (notch.distanceMm > lengthOfEdge(edge) + 0.01)
      problems.push(`${panel.id}: cran hors du bord ${edge.id}`);
  }
  return problems;
}

function seamProblems(spec: GarmentSpec): string[] {
  const problems: string[] = [];
  const used = new Set<string>();
  for (const seam of spec.seams) {
    for (const ref of [seam.a, seam.b]) {
      const key = `${ref.panelId}#${ref.edgeId}`;
      const found = spec.panels
        .find((panel) => panel.id === ref.panelId)
        ?.edges.some((e) => e.id === ref.edgeId);
      if (!found) problems.push(`couture ${seam.id}: bord introuvable ${key}`);
      if (used.has(key)) problems.push(`couture ${seam.id}: bord déjà cousu ${key}`);
      used.add(key);
    }
  }
  return problems;
}

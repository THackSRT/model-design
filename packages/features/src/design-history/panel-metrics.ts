import type { Edge, GarmentSpec } from '@atelier/contracts-ts';

type Point = readonly [number, number];

/** Segments par courbe de Bézier : l'erreur d'aire et de périmètre est de l'ordre de 1/N². */
const CURVE_STEPS = 64;

export interface PanelMetrics {
  id: string;
  name: string;
  /** Aire du contour, mm² (une seule pièce, quelle que soit `quantity`). */
  areaMm2: number;
  /** Longueur du contour, mm. */
  perimeterMm: number;
}

function bezierAt(points: readonly Point[], t: number): Point {
  if (points.length === 1) return points[0] as Point;
  const next = points.slice(1).map((p, i): Point => {
    const q = points[i] as Point;
    return [q[0] + (p[0] - q[0]) * t, q[1] + (p[1] - q[1]) * t];
  });
  return bezierAt(next, t);
}

/** Points d'un bord après son début, courbe aplatie en segments (le dernier est `to`). */
function flattenEdge(edge: Edge): Point[] {
  const controls = (edge.controls ?? []) as readonly Point[];
  if (controls.length === 0) return [edge.to];
  const points = [edge.from, ...controls, edge.to];
  const flat: Point[] = [];
  for (let step = 1; step < CURVE_STEPS; step += 1) flat.push(bezierAt(points, step / CURVE_STEPS));
  flat.push(edge.to);
  return flat;
}

/** Contour d'une pièce en polygone : courbes aplaties, premier point non répété à la fin. */
export function flattenOutline(edges: readonly Edge[]): Point[] {
  const first = edges[0];
  if (!first) return [];
  const outline: Point[] = [first.from];
  for (const edge of edges) outline.push(...flattenEdge(edge));
  outline.pop(); // le dernier bord revient au départ
  return outline;
}

/** Aire (mm²) d'un polygone, formule des lacets ; toujours positive. */
export function polygonArea(outline: readonly Point[]): number {
  let twice = 0;
  outline.forEach((p, i) => {
    const q = outline[(i + 1) % outline.length] as Point;
    twice += p[0] * q[1] - q[0] * p[1];
  });
  return Math.abs(twice) / 2;
}

/** Périmètre (mm) d'un polygone fermé. */
export function polygonPerimeter(outline: readonly Point[]): number {
  return outline.reduce((sum, p, i) => {
    const q = outline[(i + 1) % outline.length] as Point;
    return sum + Math.hypot(q[0] - p[0], q[1] - p[1]);
  }, 0);
}

/** Aire et périmètre de chaque pièce d'un patron, dans l'ordre du patron (affichage seulement, ADR 0014). */
export function measurePanels(spec: GarmentSpec): PanelMetrics[] {
  return spec.panels.map((panel) => {
    const outline = flattenOutline(panel.edges);
    return {
      id: panel.id,
      name: panel.name,
      areaMm2: polygonArea(outline),
      perimeterMm: polygonPerimeter(outline),
    };
  });
}

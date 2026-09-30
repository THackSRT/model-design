import type { Edge, GarmentSpec } from '@atelier/contracts-ts';

/** Une pièce prête à dessiner : chemin SVG en mm, y vers le bas, déjà placée à côté des autres. */
export interface PanelShape {
  id: string;
  name: string;
  path: string;
  labelAt: [number, number];
}

export interface PanelsLayout {
  panels: PanelShape[];
  viewBox: string;
}

const GAP_MM = 40;

function panelBox(edges: Edge[]) {
  const pts = edges.flatMap((e) => [e.from, e.to, ...(e.controls ?? [])]);
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

function pathOf(edges: Edge[], place: (p: [number, number]) => string): string {
  const first = edges[0];
  if (!first) return '';
  const segments = edges.map((e) => {
    const controls = e.controls ?? [];
    const command = controls.length === 2 ? 'C' : controls.length === 1 ? 'Q' : 'L';
    return `${command} ${[...controls, e.to].map(place).join(' ')}`;
  });
  return `M ${place(first.from)} ${segments.join(' ')} Z`;
}

/** Place les pièces côte à côte et les retourne pour l'écran (y du patron vers le haut). */
export function layoutPanels(spec: GarmentSpec): PanelsLayout {
  let offsetX = 0;
  let height = 0;
  const panels = spec.panels.map((panel) => {
    const box = panelBox(panel.edges);
    const dx = offsetX - box.minX;
    const place = (p: [number, number]) =>
      `${(p[0] + dx).toFixed(1)} ${(box.maxY - p[1]).toFixed(1)}`;
    const shape: PanelShape = {
      id: panel.id,
      name: panel.name,
      path: pathOf(panel.edges, place),
      labelAt: [offsetX + (box.maxX - box.minX) / 2, (box.maxY - box.minY) / 2],
    };
    offsetX += box.maxX - box.minX + GAP_MM;
    height = Math.max(height, box.maxY - box.minY);
    return shape;
  });
  const width = Math.max(offsetX - GAP_MM, 1);
  return { panels, viewBox: `-10 -10 ${(width + 20).toFixed(0)} ${(height + 20).toFixed(0)}` };
}

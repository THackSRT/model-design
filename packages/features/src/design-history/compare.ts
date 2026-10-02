import type { DesignVersion, DesignVersionChanges } from '@atelier/contracts-ts';
import { measurePanels, type PanelMetrics } from './panel-metrics.js';

/** Une pièce (même `id`) dans les deux versions ; `from` ou `to` absent : pièce ajoutée ou retirée. */
export interface PanelComparison {
  id: string;
  name: string;
  from?: PanelMetrics;
  to?: PanelMetrics;
  /** `to - from`, présents seulement si la pièce existe dans les deux versions. */
  areaDeltaMm2?: number;
  perimeterDeltaMm?: number;
}

/** Comparaison de deux versions : entrées (service) et géométrie (calculée ici, pour l'affichage). */
export interface VersionComparison {
  designId: string;
  fromNumber: number;
  toNumber: number;
  changes: DesignVersionChanges;
  panels: PanelComparison[];
}

/** Pièces des deux patrons rapprochées par `id` : d'abord celles de `from`, puis les ajoutées. */
export function comparePanels(
  from: Pick<DesignVersion, 'spec'>,
  to: Pick<DesignVersion, 'spec'>,
): PanelComparison[] {
  const before = measurePanels(from.spec);
  const after = new Map(measurePanels(to.spec).map((p) => [p.id, p]));
  const rows: PanelComparison[] = before.map((fromMetrics) => {
    const toMetrics = after.get(fromMetrics.id);
    after.delete(fromMetrics.id);
    return row(fromMetrics, toMetrics);
  });
  for (const toMetrics of after.values()) rows.push(row(undefined, toMetrics));
  return rows;
}

function row(from?: PanelMetrics, to?: PanelMetrics): PanelComparison {
  const known = (from ?? to) as PanelMetrics;
  return {
    id: known.id,
    name: (to ?? known).name,
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(from && to
      ? {
          areaDeltaMm2: to.areaMm2 - from.areaMm2,
          perimeterDeltaMm: to.perimeterMm - from.perimeterMm,
        }
      : {}),
  };
}

export function buildComparison(
  changes: DesignVersionChanges,
  from: DesignVersion,
  to: DesignVersion,
): VersionComparison {
  return {
    designId: changes.designId,
    fromNumber: from.number,
    toNumber: to.number,
    changes,
    panels: comparePanels(from, to),
  };
}

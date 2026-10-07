import { SheetError } from './errors.js';
import { carriedStops, declaredStops, placeStop } from './notches.js';
import type { Stop } from './notches.js';
import { finishPanel, simplifyPanel, startPanel } from './panels.js';
import type {
  EdgeRun,
  Pattern,
  PatternNotch,
  PatternPanel,
  PatternSeamEnd,
} from './pattern-types.js';
import type { Piece } from './pieces.js';
import { patternSeamsOf, sewSeam } from './seams.js';
import type { Values } from './seams.js';
import type { ModelSheet } from './sheet.js';
import type { DraftedPart } from './types.js';

/** Chaque bord de la fiche est cousu dans une couture au plus : la découpe d'une seconde couture défairait la première. */
function assertEachEdgeSewnOnce(sheet: ModelSheet): void {
  const seen = new Set<string>();
  for (const seam of sheet.seams) {
    for (const end of [...seam.a, ...seam.b]) {
      const key = `${end.part}#${end.edge}`;
      if (seen.has(key)) {
        throw new SheetError(`seam ${seam.id}`, `edge "${key}" is sewn in more than one seam`);
      }
      seen.add(key);
    }
  }
}

/** Crans d'une pièce, dans l'ordre de ses bords puis le long de chacun. */
function notchesOf(
  panel: { edges: readonly EdgeRun[]; id: string },
  stops: readonly Stop[],
): PatternNotch[] {
  return stops
    .filter((stop) => stop.run.panel === panel.id)
    .sort(
      (p, q) =>
        panel.edges.indexOf(p.run) - panel.edges.indexOf(q.run) || p.distanceMm - q.distanceMm,
    )
    .map(placeStop);
}

/**
 * Assemble le patron d'un modèle depuis ses pièces tracées et sa fiche : bords en droites et courbes de Bézier uniques,
 * coutures appariées et coupées (embu déclaré, jamais déduit), crans déclarés et reportés de l'autre côté des coutures,
 * droit fil, pose. Le patron sort dans le repère de GarmentSpec (y vers le haut). Pur et déterministe. Erreur typée
 * (`SheetError`, `SeamError`, `ContourError`) au premier défaut de la fiche ou du tracé.
 */
export function assemblePattern(
  sheet: ModelSheet,
  parts: readonly DraftedPart[],
  values: Values,
): Pattern {
  assertEachEdgeSewnOnce(sheet);
  const runs = sheet.parts.map((part) =>
    startPanel(
      part,
      parts.find((drafted) => drafted.id === part.id),
    ),
  );
  const index = new Map(
    runs.flatMap((run) =>
      run.edges.map((edge) => [`${run.sheet.id}#${edge.sheet.id}`, edge] as const),
    ),
  );
  const declared = runs.flatMap(declaredStops);
  runs.forEach(simplifyPanel);
  const sewn = sheet.seams.map((seam) => sewSeam(seam, index, values));
  const stops = [...declared, ...declared.flatMap((stop) => carriedStops(stop, sewn))];
  const panels: PatternPanel[] = runs.map((run) =>
    finishPanel(run, notchesOf({ id: run.sheet.id, edges: run.edges }, stops)),
  );
  const ends = new Map<Piece, PatternSeamEnd>(
    panels.flatMap((panel) =>
      panel.edges.map((edge) => [edge.piece, { panelId: panel.id, edgeId: edge.id }] as const),
    ),
  );
  return {
    garmentType: sheet.garmentType,
    panels,
    seams: sewn.flatMap((seam) => patternSeamsOf(seam, (piece) => ends.get(piece))),
  };
}

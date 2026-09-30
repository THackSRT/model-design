import { silhouettePaths, type Silhouette, type SilhouetteView } from './silhouette/index.js';
import { useMemo } from 'react';
import type { MeshData } from './scene.js';

export interface MannequinOutlineProps {
  mesh: MeshData;
  /** Vues à dessiner, dans l'ordre d'affichage. */
  views: readonly SilhouetteView[];
  /** Libellé accessible de chaque vue (traduit par l'appelant). */
  labels: Readonly<Record<SilhouetteView, string>>;
  /** Marge autour de la silhouette dans le `viewBox`, en cm (défaut 2). */
  marginCm?: number;
}

const DEFAULT_MARGIN_CM = 2;
const STYLE = {
  fill: 'none',
  stroke: 'var(--color-pattern-stroke)',
  strokeWidth: 'var(--stroke-pattern)',
  strokeLinejoin: 'round',
} as const;

function Outline(props: { silhouette: Silhouette; label: string; margin: number }) {
  const { silhouette, label, margin } = props;
  const box = [
    -margin,
    -margin,
    silhouette.widthCm + 2 * margin,
    silhouette.heightCm + 2 * margin,
  ].join(' ');
  return (
    <svg role="img" aria-label={label} viewBox={box} style={{ height: '100%', maxWidth: '100%' }}>
      <path d={silhouette.d} vectorEffect="non-scaling-stroke" fillRule="evenodd" style={STYLE} />
    </svg>
  );
}

/** Silhouettes en trait du mannequin (un `<svg>` par vue, unités du `viewBox` : cm). */
export function MannequinOutline({
  mesh,
  views,
  labels,
  marginCm = DEFAULT_MARGIN_CM,
}: MannequinOutlineProps) {
  // Clé stable : un tableau `views` écrit en ligne, de même contenu, ne relance pas le calcul.
  const viewsKey = views.join(',');
  const silhouettes = useMemo(
    () =>
      (viewsKey === '' ? [] : (viewsKey.split(',') as SilhouetteView[])).map((view) => ({
        view,
        silhouette: silhouettePaths(mesh, view),
      })),
    [mesh, viewsKey],
  );
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', height: '100%' }}>
      {silhouettes.map(({ view, silhouette }) => (
        <Outline key={view} silhouette={silhouette} label={labels[view]} margin={marginCm} />
      ))}
    </div>
  );
}

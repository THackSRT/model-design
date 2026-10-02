import {
  silhouetteOrigin,
  silhouettePaths,
  type Silhouette,
  type SilhouetteView,
} from './silhouette/index.js';
import { useMemo } from 'react';
import type { MeshData } from './scene.js';

export interface MannequinOutlineProps {
  mesh: MeshData;
  /** Vêtement porté : sa silhouette est superposée à celle du corps, d'un trait distinct. */
  garment?: MeshData;
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
const GARMENT_STYLE = { ...STYLE, stroke: 'var(--color-garment-stroke)' } as const;

/** Une silhouette et son coin haut-gauche dans le plan de la vue. */
interface Placed {
  silhouette: Silhouette;
  leftCm: number;
  topCm: number;
}

interface ViewLayers {
  view: SilhouetteView;
  body: Placed;
  garment?: Placed;
}

function place(mesh: MeshData, view: SilhouetteView): Placed {
  return { silhouette: silhouettePaths(mesh, view), ...silhouetteOrigin(mesh, view) };
}

/** Boîte commune au corps et au vêtement ; chaque tracé est translaté vers son coin dans cette boîte. */
function frameOf({ body, garment }: ViewLayers) {
  const layers = garment ? [body, garment] : [body];
  const left = Math.min(...layers.map((l) => l.leftCm));
  const top = Math.max(...layers.map((l) => l.topCm));
  const right = Math.max(...layers.map((l) => l.leftCm + l.silhouette.widthCm));
  const bottom = Math.min(...layers.map((l) => l.topCm - l.silhouette.heightCm));
  const shift = (l: Placed) => `translate(${l.leftCm - left} ${top - l.topCm})`;
  return { widthCm: right - left, heightCm: top - bottom, shift };
}

function Outline(props: { layers: ViewLayers; label: string; margin: number }) {
  const { layers, label, margin } = props;
  const { widthCm, heightCm, shift } = frameOf(layers);
  const box = [-margin, -margin, widthCm + 2 * margin, heightCm + 2 * margin].join(' ');
  return (
    <svg role="img" aria-label={label} viewBox={box} style={{ height: '100%', maxWidth: '100%' }}>
      <path
        d={layers.body.silhouette.d}
        transform={shift(layers.body)}
        vectorEffect="non-scaling-stroke"
        fillRule="evenodd"
        style={STYLE}
      />
      {layers.garment && (
        <path
          data-layer="garment"
          d={layers.garment.silhouette.d}
          transform={shift(layers.garment)}
          vectorEffect="non-scaling-stroke"
          fillRule="evenodd"
          style={GARMENT_STYLE}
        />
      )}
    </svg>
  );
}

/** Silhouettes en trait du mannequin (un `<svg>` par vue, unités du `viewBox` : cm). */
export function MannequinOutline({
  mesh,
  garment,
  views,
  labels,
  marginCm = DEFAULT_MARGIN_CM,
}: MannequinOutlineProps) {
  // Clé stable : un tableau `views` écrit en ligne, de même contenu, ne relance pas le calcul.
  const viewsKey = views.join(',');
  const layers = useMemo(
    () =>
      (viewsKey === '' ? [] : (viewsKey.split(',') as SilhouetteView[])).map(
        (view): ViewLayers => ({
          view,
          body: place(mesh, view),
          ...(garment ? { garment: place(garment, view) } : {}),
        }),
      ),
    [mesh, garment, viewsKey],
  );
  return (
    <div style={{ display: 'flex', gap: 'var(--space-4)', height: '100%' }}>
      {layers.map((layer) => (
        <Outline key={layer.view} layers={layer} label={labels[layer.view]} margin={marginCm} />
      ))}
    </div>
  );
}

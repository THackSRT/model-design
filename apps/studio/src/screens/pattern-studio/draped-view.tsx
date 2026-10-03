import { ColorGarment, ColorGarmentTight, ColorMannequin } from '@atelier/design-tokens';
import { Message } from '@atelier/ui-web';
import { MannequinView, readDrapedGlb, type MeshData } from '@atelier/viewer3d';
import { useMemo } from 'react';
import { t } from '../../i18n/t.js';

export interface DrapedViewProps {
  /** Modèle glTF binaire du drapé. */
  model: ArrayBuffer;
  /** Corps ajusté, bras à l’horizontale comme dans le drapé. */
  meshes: MeshData[];
}

/**
 * Lit le GLB et montre le vêtement drapé sur le mannequin. Chargé à la demande avec three.js
 * (jamais importé statiquement) ; un GLB illisible est un échec affiché, pas une exception.
 */
export default function DrapedView({ model, meshes }: DrapedViewProps) {
  const result = useMemo(() => readDrapedGlb(model), [model]);
  const draped = useMemo(
    () =>
      result.ok
        ? { layers: result.layers, color: ColorGarment, tightColor: ColorGarmentTight }
        : undefined,
    [result],
  );
  if (!draped) return <Message tone="danger">{t('drape.unreadable')}</Message>;
  return (
    <MannequinView
      meshes={meshes}
      draped={draped}
      color={ColorMannequin}
      label={t('mannequin.label')}
      webglUnavailableLabel={t('mannequin.webglUnavailable')}
    />
  );
}

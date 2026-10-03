import {
  createDesignsClient,
  useCutPieces,
  useDrape,
  usePatternStudio,
  useStudioHistory,
} from '@atelier/features';
import { useMemo, useState } from 'react';
import { browserFileSaver } from '../../platform/download.js';
import { getMannequinFitter } from '../../platform/mannequin.js';
import { garmentName, t } from '../../i18n/t.js';
import { DEFAULT_DRAPE_PRESET, type DrapePreset } from './drape-fabrics.js';
import { PatternStudioView } from './view.js';

export interface PatternStudioScreenProps {
  /** Demande une confirmation à l'utilisateur ; `window.confirm` par défaut. */
  confirm?: (message: string) => boolean;
}

type Studio = ReturnType<typeof usePatternStudio>['state'];
interface Deps {
  designs: Parameters<typeof useDrape>[0]['designs'];
}

/**
 * Drapé de la version enregistrée. Une saisie modifiée depuis le calcul retire la version : le drapé
 * affiché lui appartient. Le drapé se pose sur le corps de l'habillage : même pose des bras (`AVATAR_ARM_ANGLE_DEG`).
 */
function useDrapeOf(deps: Deps, studio: Studio) {
  const { designId, versionNumber, dirty } = studio;
  const [preset, setPreset] = useState<DrapePreset>(DEFAULT_DRAPE_PRESET);
  const [hidden, setHidden] = useState<ArrayBuffer>();
  const version = designId && versionNumber && !dirty ? { designId, versionNumber } : undefined;
  const fabric = useMemo(() => ({ preset }), [preset]);
  const drape = useDrape({ designs: deps.designs }, version, fabric);
  const model = drape.state.status === 'completed' ? drape.state.model : undefined;
  const shown = model !== undefined && model !== hidden;
  return {
    panel: {
      ...drape,
      preset,
      onPresetChange: setPreset,
      shown,
      onShownChange: (show: boolean) => setHidden(show ? undefined : model),
    },
    draped: shown ? { model } : undefined,
  };
}

/** Branche le modèle de vue sur la vue : seul view.tsx change lors d'un redesign. */
export function PatternStudioScreen({
  confirm = (message) => window.confirm(message),
}: PatternStudioScreenProps) {
  const deps = useMemo(
    () => ({
      designs: createDesignsClient('/api/designs'),
      mannequin: getMannequinFitter(),
      designName: garmentName,
    }),
    [],
  );
  const studio = usePatternStudio(deps);
  const { designId, versionNumber } = studio.state;
  const version = designId && versionNumber ? { designId, versionNumber } : undefined;
  const cutPieces = useCutPieces({ designs: deps.designs, files: browserFileSaver }, version);
  const history = useStudioHistory({ designs: deps.designs }, studio, (number) =>
    confirm(t('history.confirmResume', { number })),
  );
  const historyProps = {
    state: history.state,
    actions: { ...history.actions, resume: (n: number) => void history.actions.resume(n) },
    currentNumber: history.currentNumber,
  };
  const drape = useDrapeOf(deps, studio.state);
  return (
    <PatternStudioView
      {...studio}
      cutPieces={cutPieces}
      history={historyProps}
      drape={drape.panel}
      draped={drape.draped}
    />
  );
}

import {
  createDesignsClient,
  toVersionRequest,
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
import { useDrapedBody } from './use-draped-body.js';
import { PatternStudioView } from './view.js';

export interface PatternStudioScreenProps {
  /** Demande une confirmation à l'utilisateur ; `window.confirm` par défaut. */
  confirm?: (message: string) => boolean;
}

type Studio = ReturnType<typeof usePatternStudio>['state'];
interface Deps {
  designs: Parameters<typeof useDrape>[0]['designs'];
  mannequin: Parameters<typeof useDrapedBody>[0];
}

/**
 * Drapé de la version enregistrée. Une saisie modifiée depuis le calcul retire la version : le drapé
 * affiché lui appartient. Le corps du drapé est ajusté avec les mesures de cette version.
 */
function useDrapeOf(deps: Deps, studio: Studio) {
  const { designId, versionNumber, form, dirty } = studio;
  const [preset, setPreset] = useState<DrapePreset>(DEFAULT_DRAPE_PRESET);
  const [hidden, setHidden] = useState<ArrayBuffer>();
  const version = designId && versionNumber && !dirty ? { designId, versionNumber } : undefined;
  const fabric = useMemo(() => ({ preset }), [preset]);
  const drape = useDrape({ designs: deps.designs }, version, fabric);
  const model = drape.state.status === 'completed' ? drape.state.model : undefined;
  const shown = model !== undefined && model !== hidden;
  const measurements = useMemo(() => {
    const request = toVersionRequest(form);
    return request.isOk() ? request.value.measurements : undefined;
  }, [form]);
  const body = useDrapedBody(deps.mannequin, version && measurements, shown);
  return {
    panel: {
      ...drape,
      preset,
      onPresetChange: setPreset,
      shown,
      onShownChange: (show: boolean) => setHidden(show ? undefined : model),
    },
    draped: shown ? { model, body } : undefined,
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

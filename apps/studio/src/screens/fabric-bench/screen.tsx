import { FABRIC_REPORT_MAX_BYTES, useFabricBench } from '@atelier/features';
import { useMemo } from 'react';
import { tBench } from '../../i18n/bench.js';
import { getCusickRunner } from '../../platform/cusick.js';
import { browserFileSaver } from '../../platform/download.js';
import { readFileText } from '../../platform/read-file.js';
import { useUnsavedGuard } from '../../platform/unsaved-guard.js';
import { FabricBenchView } from './view.js';

export interface FabricBenchScreenProps {
  /** Demande une confirmation à l'utilisateur ; `window.confirm` par défaut. */
  confirm?: (message: string) => boolean;
}

/** Branche le modèle de vue du banc d'essai sur la vue ; l'essai de drapé simulé tourne dans un Web Worker. */
export function FabricBenchScreen({
  confirm = (message) => window.confirm(message),
}: FabricBenchScreenProps) {
  const deps = useMemo(
    () => ({ saver: browserFileSaver, now: () => new Date(), cusick: getCusickRunner() }),
    [],
  );
  const { state, actions } = useFabricBench(deps);
  useUnsavedGuard(state.dirty);

  const onImportFile = (file: File) => {
    // Un import remplace la saisie : on ne l'écrase pas sans accord quand elle n'est pas exportée.
    if (state.dirty && !confirm(tBench('fabricBench.report.confirmOverwrite'))) return;
    // Un fichier illisible est traité comme un fichier qui n'est pas du JSON.
    void readFileText(file, FABRIC_REPORT_MAX_BYTES)
      .catch(() => '')
      .then(actions.importReport);
  };
  return <FabricBenchView state={state} actions={actions} onImportFile={onImportFile} />;
}

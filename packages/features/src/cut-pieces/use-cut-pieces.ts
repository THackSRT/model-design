import type { ExportFormat } from '@atelier/contracts-ts';
import { type Dispatch, type SetStateAction, useCallback, useEffect, useState } from 'react';
import type { ApiProblem, DesignsClient } from '../api/designs-client.js';
import { type CutPiecesLayout, layoutCutPieces } from './layout.js';

/** Port d'enregistrement d'un fichier : le navigateur le branche (lien temporaire), les tests un faux. */
export interface FileSaver {
  save(blob: Blob, fileName: string): void;
}

export interface CutPiecesDeps {
  designs: DesignsClient;
  files: FileSaver;
}

/** Version dont on affiche les pièces ; absente tant qu'aucun patron n'est calculé. */
export interface VersionRef {
  designId: string;
  versionNumber: number;
}

export const EXPORT_FORMATS: readonly ExportFormat[] = ['svg', 'pdf-a4-tiled', 'dxf-aama'];

export interface ExportState {
  status: 'idle' | 'working' | 'failed';
  problem?: ApiProblem;
}

export interface CutPiecesState {
  status: 'idle' | 'working' | 'ready' | 'failed';
  layout?: CutPiecesLayout;
  problem?: ApiProblem;
  exports: Record<ExportFormat, ExportState>;
}

export interface CutPiecesActions {
  download(format: ExportFormat): void;
}

const idleExports = (): CutPiecesState['exports'] => ({
  svg: { status: 'idle' },
  'pdf-a4-tiled': { status: 'idle' },
  'dxf-aama': { status: 'idle' },
});
const initialState = (): CutPiecesState => ({ status: 'idle', exports: idleExports() });

type SetState = Dispatch<SetStateAction<CutPiecesState>>;

/** Demande les pièces ; rend l'annulation (la réponse d'une demande périmée est ignorée). */
function loadCutPieces(designs: DesignsClient, ref: VersionRef, setState: SetState): () => void {
  let current = true;
  setState({ status: 'working', exports: idleExports() });
  void designs.cutPattern(ref.designId, ref.versionNumber, {}).then((result) => {
    if (!current) return;
    setState((s) =>
      result.isOk()
        ? { ...s, status: 'ready', layout: layoutCutPieces(result.value) }
        : { ...s, status: 'failed', problem: result.error },
    );
  });
  return () => {
    current = false;
  };
}

async function downloadFile(
  deps: CutPiecesDeps,
  ref: VersionRef,
  format: ExportFormat,
  mark: (state: ExportState) => void,
): Promise<void> {
  mark({ status: 'working' });
  const result = await deps.designs.exportFile(ref.designId, ref.versionNumber, { format });
  if (result.isErr()) return mark({ status: 'failed', problem: result.error });
  deps.files.save(result.value.blob, result.value.fileName);
  return mark({ status: 'idle' });
}

/**
 * Pièces de coupe de la version calculée (corps `{}` : valeurs par défaut du moteur) et téléchargements.
 * Seule la dernière demande compte ; rien n'est gardé en local.
 */
export function useCutPieces(
  deps: CutPiecesDeps,
  version?: VersionRef,
): { state: CutPiecesState; actions: CutPiecesActions } {
  const [state, setState] = useState<CutPiecesState>(initialState);
  const { designs, files } = deps;
  const designId = version?.designId;
  const versionNumber = version?.versionNumber;

  useEffect(() => {
    if (designId === undefined || versionNumber === undefined) {
      setState(initialState());
      return undefined;
    }
    return loadCutPieces(designs, { designId, versionNumber }, setState);
  }, [designs, designId, versionNumber]);

  const download = useCallback(
    (format: ExportFormat) => {
      if (designId === undefined || versionNumber === undefined) return;
      const mark = (next: ExportState) =>
        setState((s) => ({ ...s, exports: { ...s.exports, [format]: next } }));
      void downloadFile({ designs, files }, { designId, versionNumber }, format, mark);
    },
    [designs, files, designId, versionNumber],
  );

  return { state, actions: { download } };
}

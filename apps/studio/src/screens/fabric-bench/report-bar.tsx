import type { FabricBenchActions, FabricBenchState } from '@atelier/features';
import { Button, FileButton, Message, Panel } from '@atelier/ui-web';
import { importErrorMessage, noticeMessage, tBench } from '../../i18n/bench.js';

export interface ReportBarProps {
  state: Pick<
    FabricBenchState,
    'canExport' | 'dirty' | 'importStatus' | 'importError' | 'importNotices'
  >;
  onExport: FabricBenchActions['exportReport'];
  onImportFile: (file: File) => void;
}

function ImportFeedback({ state }: Pick<ReportBarProps, 'state'>) {
  const { importStatus, importError, importNotices } = state;
  return (
    <>
      {importStatus === 'failed' && importError && (
        <Message tone="danger">{importErrorMessage(importError)}</Message>
      )}
      {importStatus === 'imported' && <Message>{tBench('fabricBench.report.imported')}</Message>}
      {importNotices.map((notice) => (
        <Message key={`${notice.code}-${'preset' in notice ? notice.preset : ''}`}>
          {noticeMessage(notice)}
        </Message>
      ))}
    </>
  );
}

/** Export et import du rapport de validation, avec le résultat du dernier import. */
export function ReportBar({ state, onExport, onImportFile }: ReportBarProps) {
  return (
    <Panel title={tBench('fabricBench.report.title')}>
      <div className="bench-actions">
        <Button emphasis="high" disabled={!state.canExport} onClick={onExport}>
          {tBench('fabricBench.report.export')}
        </Button>
        <FileButton accept="application/json,.json" onFile={onImportFile}>
          {tBench('fabricBench.report.import')}
        </FileButton>
      </div>
      {!state.canExport && <p className="bench-tip">{tBench('fabricBench.report.exportHint')}</p>}
      {state.dirty && <Message>{tBench('fabricBench.report.dirty')}</Message>}
      <ImportFeedback state={state} />
    </Panel>
  );
}

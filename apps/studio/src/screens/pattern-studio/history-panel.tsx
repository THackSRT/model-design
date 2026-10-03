import type { DesignHistoryActions, DesignHistoryState } from '@atelier/features';
import { Button, Message, Panel } from '@atelier/ui-web';
import { useState } from 'react';
import { garmentName, problemMessage, t } from '../../i18n/t.js';
import { ComparisonView } from './comparison-view.js';
import { defaultSelection, summaryParams } from './history-format.js';

export interface HistoryPanelProps {
  state: DesignHistoryState;
  actions: Pick<DesignHistoryActions, 'loadMore' | 'compare' | 'clearComparison'> & {
    /** Reprend une version : confirmation et application au formulaire sont faites par l'écran. */
    resume(versionNumber: number): void;
  };
  /** Dernière version calculée dans la session : marquée « version courante ». */
  currentNumber?: number;
}

type Summary = DesignHistoryState['versions'][number];

function VersionItem({ version, current, busy, onResume }: VersionItemProps) {
  return (
    <li className="studio-history-item" data-current={current}>
      <strong>{t('history.version', { number: version.number })}</strong>
      {current && <span className="studio-badge">{t('history.current')}</span>}
      <span>{t('history.date', { at: Date.parse(version.createdAt) })}</span>
      <span>{garmentLabel(version)}</span>
      <ul className="studio-history-list">
        {summaryParams(version).map((p) => (
          <li key={p.path}>{t('history.param', { label: p.label, valueMm: p.valueMm })}</li>
        ))}
      </ul>
      <Button disabled={busy} onClick={() => onResume(version.number)}>
        {t('history.resume', { number: version.number })}
      </Button>
    </li>
  );
}

interface VersionItemProps {
  version: Summary;
  current: boolean;
  busy: boolean;
  onResume(versionNumber: number): void;
}

const garmentLabel = (version: Summary) => garmentName(version.garment.type);

function VersionList({ state, actions, currentNumber }: HistoryPanelProps) {
  const busy = state.resume.status === 'working';
  return (
    <>
      <ul className="studio-history-list" aria-label={t('history.title')}>
        {state.versions.map((version) => (
          <VersionItem
            key={version.number}
            version={version}
            current={version.number === currentNumber}
            busy={busy}
            onResume={actions.resume}
          />
        ))}
      </ul>
      {state.hasMore && (
        <Button disabled={state.loadingMore} onClick={actions.loadMore}>
          {t(state.loadingMore ? 'history.loadingMore' : 'history.more')}
        </Button>
      )}
    </>
  );
}

interface VersionSelectProps {
  label: string;
  value: number;
  numbers: number[];
  onChange(value: number): void;
}

function VersionSelect({ label, value, numbers, onChange }: VersionSelectProps) {
  return (
    <label className="studio-select">
      {label}
      <select value={value} onChange={(e) => onChange(Number(e.target.value))}>
        {numbers.map((n) => (
          <option key={n} value={n}>
            {t('history.version', { number: n })}
          </option>
        ))}
      </select>
    </label>
  );
}

function ComparePicker({ state, actions, currentNumber }: HistoryPanelProps) {
  const [chosen, setChosen] = useState<{ from: number; to: number }>();
  const selection = chosen ?? defaultSelection(state.versions, currentNumber);
  if (!selection || state.versions.length < 2) return null;
  const numbers = state.versions.map((v) => v.number);
  const working = state.comparison.status === 'working';
  return (
    <div className="studio-compare" role="group" aria-label={t('history.compare.title')}>
      <VersionSelect
        label={t('history.compare.from')}
        value={selection.from}
        numbers={numbers}
        onChange={(from) => setChosen({ ...selection, from })}
      />
      <VersionSelect
        label={t('history.compare.to')}
        value={selection.to}
        numbers={numbers}
        onChange={(to) => setChosen({ ...selection, to })}
      />
      <Button disabled={working} onClick={() => actions.compare(selection.from, selection.to)}>
        {t('history.compare.run')}
      </Button>
      {state.comparison.status !== 'idle' && (
        <Button onClick={actions.clearComparison}>{t('history.compare.close')}</Button>
      )}
    </div>
  );
}

function Comparison({ state }: Pick<HistoryPanelProps, 'state'>) {
  const { comparison } = state;
  if (comparison.status === 'working') return <Message>{t('history.compare.working')}</Message>;
  if (comparison.status === 'failed' && comparison.problem) {
    return <Message tone="danger">{problemMessage(comparison.problem.type)}</Message>;
  }
  return comparison.result ? <ComparisonView result={comparison.result} /> : null;
}

function Body(props: HistoryPanelProps) {
  const { state } = props;
  if (state.status === 'loading') return <Message>{t('history.loading')}</Message>;
  if (state.status === 'failed' && state.problem) {
    return <Message tone="danger">{problemMessage(state.problem.type)}</Message>;
  }
  return (
    <>
      {state.resume.status === 'working' && state.resume.versionNumber !== undefined && (
        <Message>{t('history.resuming', { number: state.resume.versionNumber })}</Message>
      )}
      {state.resume.status === 'failed' && state.resume.problem && (
        <Message tone="danger">{problemMessage(state.resume.problem.type)}</Message>
      )}
      {state.versions.length === 0 && <Message>{t('history.empty')}</Message>}
      <VersionList {...props} />
      <ComparePicker {...props} />
      <Comparison state={state} />
    </>
  );
}

/** Historique des versions du modèle de la session : reprise et comparaison. Absent sans modèle. */
export function HistoryPanel(props: HistoryPanelProps) {
  if (props.state.status === 'idle') return null;
  return (
    <Panel title={t('history.title')}>
      <details className="studio-fold-panel" open>
        <summary>{t('history.toggle')}</summary>
        <Body {...props} />
      </details>
    </Panel>
  );
}

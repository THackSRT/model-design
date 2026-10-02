import type { VersionComparison } from '@atelier/features';
import { Message } from '@atelier/ui-web';
import { measurementChangeText, paramChangeText } from './history-format.js';
import { t } from '../../i18n/t.js';

type Row = VersionComparison['panels'][number];

const changeOf = (row: Row) => (!row.from ? 'added' : !row.to ? 'removed' : 'kept');

function PanelRow({ row }: { row: Row }) {
  const change = changeOf(row);
  return (
    <tr data-change={change}>
      <th scope="row">{t('history.panels.label', { change, name: row.name })}</th>
      <td>{row.from && t('history.area', { areaMm2: row.from.areaMm2 })}</td>
      <td>{row.to && t('history.area', { areaMm2: row.to.areaMm2 })}</td>
      <td>
        {row.areaDeltaMm2 !== undefined && t('history.areaDelta', { areaMm2: row.areaDeltaMm2 })}
      </td>
      <td>
        {row.perimeterDeltaMm !== undefined &&
          t('history.perimeterDelta', { lengthMm: row.perimeterDeltaMm })}
      </td>
    </tr>
  );
}

function PanelsTable({ panels }: { panels: Row[] }) {
  return (
    <table className="studio-table" aria-label={t('history.panels.title')}>
      <thead>
        <tr>
          <th scope="col">{t('history.panels.name')}</th>
          <th scope="col">{t('history.panels.areaFrom')}</th>
          <th scope="col">{t('history.panels.areaTo')}</th>
          <th scope="col">{t('history.panels.areaDelta')}</th>
          <th scope="col">{t('history.panels.perimeterDelta')}</th>
        </tr>
      </thead>
      <tbody>
        {panels.map((row) => (
          <PanelRow key={row.id} row={row} />
        ))}
      </tbody>
    </table>
  );
}

export interface ChangeLine {
  key: string;
  text: string;
}

export function ChangeList({ title, lines }: { title: string; lines: ChangeLine[] }) {
  if (lines.length === 0) return null;
  return (
    <section aria-label={title}>
      <h3>{title}</h3>
      <ul className="studio-history-list">
        {lines.map((line) => (
          <li key={line.key}>{line.text}</li>
        ))}
      </ul>
    </section>
  );
}

/** Résultat d'une comparaison : changements du service, puis écarts par pièce. */
export function ComparisonView({ result }: { result: VersionComparison }) {
  const type = result.changes.to.garment.type;
  const { params, measurements, sameFingerprint } = result.changes;
  return (
    <div className="studio-comparison">
      <h3>{t('history.compare.result', { from: result.fromNumber, to: result.toNumber })}</h3>
      {sameFingerprint && <Message>{t('history.compare.same')}</Message>}
      {!sameFingerprint && params.length + measurements.length === 0 && (
        <Message>{t('history.compare.noChanges')}</Message>
      )}
      <ChangeList
        title={t('history.compare.params')}
        lines={params.map((c) => ({ key: c.path, text: paramChangeText(type, c) }))}
      />
      <ChangeList
        title={t('history.compare.measurements')}
        lines={measurements.map((c) => ({ key: c.name, text: measurementChangeText(c) }))}
      />
      <PanelsTable panels={result.panels} />
    </div>
  );
}

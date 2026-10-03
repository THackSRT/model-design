import type { DesignHistoryState, VersionComparison } from '@atelier/features';
import { hasMessage, paramLabel, t } from '../../i18n/t.js';
import type { CoreMessageKey } from '../../i18n/fr.js';

type DesignVersionSummary = DesignHistoryState['versions'][number];
type ParamChange = VersionComparison['changes']['params'][number];
type MeasurementChange = VersionComparison['changes']['measurements'][number];

type Value = number | string | boolean | undefined;

/** Longueur en millimètres si le nom finit par `Mm` (convention des contrats), sinon nombre sans unité. */
function formatNumber(name: string, value: number): string {
  return name.endsWith('Mm')
    ? t('history.value.cm', { valueMm: value })
    : t('history.value.number', { value });
}

function formatValue(name: string, value: Value, text: (v: string) => string): string {
  if (value === undefined) return t('history.value.absent');
  if (typeof value === 'number') return formatNumber(name, value);
  if (typeof value === 'boolean') return t(value ? 'history.value.yes' : 'history.value.no');
  return text(value);
}

const keyIfKnown = (key: string): CoreMessageKey | undefined =>
  hasMessage(key) ? (key as CoreMessageKey) : undefined;

/** Libellé d'un paramètre changé : les paramètres des manches ont leur propre catalogue. */
export function paramChangeLabel(garmentType: string, path: string): string {
  return path.startsWith('sleeve.')
    ? paramLabel('sleeve', path.slice('sleeve.'.length))
    : paramLabel(garmentType, path);
}

export function measurementChangeLabel(name: string): string {
  const key = keyIfKnown(`measurements.${name}`);
  return t(key ?? 'measurements.other');
}

/** Ligne affichable d'un paramètre changé (valeurs telles que rendues par le service). */
export function paramChangeText(garmentType: string, change: ParamChange): string {
  return t('history.change', {
    label: paramChangeLabel(garmentType, change.path),
    from: formatValue(change.path, change.from, String),
    to: formatValue(change.path, change.to, String),
  });
}

function sexText(value: string): string {
  const key = keyIfKnown(`measurements.sex.${value}`);
  return key ? t(key) : value;
}

/** Ligne affichable d'une mesure changée ; la morphologie est traduite. */
export function measurementChangeText(change: MeasurementChange): string {
  return t('history.change', {
    label: measurementChangeLabel(change.name),
    from: formatValue(change.name, change.from, sexText),
    to: formatValue(change.name, change.to, sexText),
  });
}

/** Paramètres numériques d'une version (résumé de la liste, jamais de mesures du client). */
export function summaryParams(
  summary: DesignVersionSummary,
): Array<{ path: string; label: string; valueMm: number }> {
  return Object.entries(summary.garment.params as Record<string, unknown>).flatMap(
    ([path, valueMm]) =>
      typeof valueMm === 'number' && path.endsWith('Mm')
        ? [{ path, label: paramLabel(summary.garment.type, path), valueMm }]
        : [],
  );
}

/** Choix par défaut de la comparaison : la version précédant la courante, puis la courante. */
export function defaultSelection(
  versions: ReadonlyArray<Pick<DesignVersionSummary, 'number'>>,
  current: number | undefined,
): { from: number; to: number } | undefined {
  const numbers = versions.map((v) => v.number).sort((a, b) => b - a);
  const to = current !== undefined && numbers.includes(current) ? current : numbers[0];
  if (to === undefined) return undefined;
  return { from: numbers.find((n) => n < to) ?? to, to };
}

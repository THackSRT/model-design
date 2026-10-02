import type { MeasurementChange, ParamChange } from '@atelier/contracts-ts';
import type { DesignVersion } from './design-version.js';

type Scalar = number | string | boolean;
type Flat = Map<string, Scalar>;

export interface VersionChanges {
  readonly sameFingerprint: boolean;
  readonly params: ParamChange[];
  readonly measurements: MeasurementChange[];
}

const isScalar = (value: unknown): value is Scalar =>
  typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean';

/** Aplatit un objet en chemins pointés (`sleeve.capEaseMm`) ; seules les valeurs simples sont gardées. */
function flatten(value: object, prefix: string, into: Flat): Flat {
  for (const [key, child] of Object.entries(value)) {
    const path = prefix === '' ? key : `${prefix}.${key}`;
    if (isScalar(child)) into.set(path, child);
    else if (typeof child === 'object' && child !== null && !Array.isArray(child)) {
      flatten(child, path, into);
    }
  }
  return into;
}

const byText = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

/** Valeurs différentes entre deux tables aplaties, triées par clé ; clé absente d'un côté = côté absent. */
function differences(from: Flat, to: Flat): { key: string; from?: Scalar; to?: Scalar }[] {
  const keys = [...new Set([...from.keys(), ...to.keys()])].sort(byText);
  return keys
    .filter((key) => from.get(key) !== to.get(key))
    .map((key) => {
      const before = from.get(key);
      const after = to.get(key);
      return {
        key,
        ...(before === undefined ? {} : { from: before }),
        ...(after === undefined ? {} : { to: after }),
      };
    });
}

type Comparable = Pick<DesignVersion, 'measurements' | 'garment' | 'fingerprint'>;

/** Ce qui change des entrées (paramètres et mesures) entre deux versions, valeurs telles qu'envoyées. */
export function compareVersions(from: Comparable, to: Comparable): VersionChanges {
  const params = differences(
    flatten(from.garment.params, '', new Map()),
    flatten(to.garment.params, '', new Map()),
  ).map(({ key, ...sides }): ParamChange => ({ path: key, ...sides }));
  const measurements = differences(
    flatten(from.measurements, '', new Map()),
    flatten(to.measurements, '', new Map()),
  ).map(({ key, ...sides }): MeasurementChange => ({ name: key, ...(sides as object) }));
  return { sameFingerprint: from.fingerprint === to.fingerprint, params, measurements };
}

// Comparaison des grandeurs mesurées à l'estimation (tolérances de l'ADR 0015) et valeurs candidates.
import type { FabricDerivedValues } from '@atelier/contracts-ts';
import type { FabricPhysics } from '../core/types.js';

export type FabricProperty = keyof FabricPhysics;

export const FABRIC_PROPERTIES: readonly FabricProperty[] = [
  'weightGPerM2',
  'thicknessMm',
  'stretchWarpPercent',
  'stretchWeftPercent',
  'bendingRigidityMicroNm',
  'frictionCoefficient',
];

/** Conforme si |mesuré − estimé| ≤ max(relatif × estimé, absolu). */
export interface Tolerance {
  relative: number;
  absolute: number;
}

export const BENCH_TOLERANCES: Readonly<Record<FabricProperty, Tolerance>> = {
  weightGPerM2: { relative: 0.1, absolute: 0 },
  thicknessMm: { relative: 0.25, absolute: 0.05 },
  stretchWarpPercent: { relative: 0.3, absolute: 1 },
  stretchWeftPercent: { relative: 0.3, absolute: 1 },
  bendingRigidityMicroNm: { relative: 0.35, absolute: 0 },
  frictionCoefficient: { relative: 0.25, absolute: 0.1 },
};

export const DRAPE_COEFFICIENT_TOLERANCE = 0.05;

/**
 * Marge de comparaison : les bornes de tolérance sont incluses malgré l'erreur de la virgule flottante
 * (1 − 0,95 = 0,050000000000000044). Très inférieure à toute précision de mesure.
 */
export const TOLERANCE_EPSILON = 1e-9;

export interface Deviation {
  property: FabricProperty;
  estimated: number;
  measured: number;
  /** (mesuré − estimé) / estimé. */
  relativeDeviation: number;
  withinTolerance: boolean;
}

function isWithin(property: FabricProperty, estimated: number, measured: number): boolean {
  const { relative, absolute } = BENCH_TOLERANCES[property];
  return (
    Math.abs(measured - estimated) <= Math.max(relative * estimated, absolute) + TOLERANCE_EPSILON
  );
}

/** Écarts, dans l'ordre de `FABRIC_PROPERTIES`, pour les grandeurs présentes seulement. */
export function compareToEstimate(
  estimated: FabricPhysics,
  derived: FabricDerivedValues,
): Deviation[] {
  const deviations: Deviation[] = [];
  for (const property of FABRIC_PROPERTIES) {
    const measured = derived[property];
    if (measured === undefined) continue;
    const e = estimated[property];
    deviations.push({
      property,
      estimated: e,
      measured,
      relativeDeviation: (measured - e) / e,
      withinTolerance: isWithin(property, e, measured),
    });
  }
  return deviations;
}

export function drapeCoefficientWithinTolerance(measured: number, simulated: number): boolean {
  return Math.abs(measured - simulated) <= DRAPE_COEFFICIENT_TOLERANCE + TOLERANCE_EPSILON;
}

export type FabricBounds = Readonly<Record<FabricProperty, { minimum: number; maximum: number }>>;

export interface CandidateFabric {
  fabric: FabricPhysics;
  /** Grandeurs mesurées mais hors bornes : l'estimation est conservée. */
  outOfBounds: FabricProperty[];
}

/** Estimation où chaque grandeur mesurée, si elle est dans les bornes (incluses), remplace la valeur estimée. */
export function candidateFabric(
  estimated: FabricPhysics,
  derived: FabricDerivedValues,
  bounds: FabricBounds,
): CandidateFabric {
  const fabric: FabricPhysics = { ...estimated };
  const outOfBounds: FabricProperty[] = [];
  for (const property of FABRIC_PROPERTIES) {
    const measured = derived[property];
    if (measured === undefined) continue;
    const { minimum, maximum } = bounds[property];
    if (measured >= minimum && measured <= maximum) fabric[property] = measured;
    else outOfBounds.push(property);
  }
  return { fabric, outOfBounds };
}

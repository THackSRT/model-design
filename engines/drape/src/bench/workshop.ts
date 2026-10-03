// Essais d'atelier : conversion des mesures brutes (ADR 0015) en grandeurs physiques. Fonctions pures, hors du
// cœur déterministe (sin/cos/tan permis). Toute entrée invalide lève `RangeError` (features valide avant d'appeler).
import type {
  CantileverBendingTest,
  FabricBenchMeasurements,
  FabricDerivedValues,
  FabricPhysics,
  FabricThicknessTest,
  FabricWeighing,
  InclinedPlaneFrictionTest,
  StripStretchTest,
} from '@atelier/contracts-ts';

export const STANDARD_GRAVITY_M_PER_S2 = 9.81;
/** Charge de référence de Fabric : 10 N sur 50 mm de large. */
export const REFERENCE_STRIP_TENSION_N_PER_MM = 0.2;

const MIN_TENSION_RATIO = 0.5;
const MAX_TENSION_RATIO = 2;

function positive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} doit être un nombre fini strictement positif`);
  }
  return value;
}

function positiveSeries(values: readonly number[], name: string): number[] {
  if (values.length === 0) throw new RangeError(`${name} ne peut pas être vide`);
  return values.map((v) => positive(v, name));
}

function mean(values: readonly number[]): number {
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/** Grammage en g/m² : masse (g) / aire (mm²) × 1e6. */
export function grammageGPerM2(test: FabricWeighing): number {
  return (
    (positive(test.sampleMassG, 'sampleMassG') / positive(test.sampleAreaMm2, 'sampleAreaMm2')) *
    1e6
  );
}

/** Épaisseur moyenne, en mm. */
export function meanThicknessMm(test: FabricThicknessTest): number {
  return mean(positiveSeries(test.readingsMm, 'readingsMm'));
}

export interface StripStretchResult {
  /** (chargée − repère) / repère × 100. */
  measuredPercent: number;
  /** Tension : masse (g) × 9,81e-3 / largeur (mm), en N/mm. */
  tensionNPerMm: number;
  /** Tension / charge de référence (0,2 N/mm). */
  tensionRatio: number;
  /** Allongement ramené à la charge de référence (hypothèse linéaire). */
  stretchPercent: number;
  /** Vrai si le rapport de tension sort de [0,5 ; 2] : extrapolation peu fiable. */
  extrapolated: boolean;
}

export function stripStretch(test: StripStretchTest): StripStretchResult {
  const width = positive(test.stripWidthMm, 'stripWidthMm');
  const gauge = positive(test.gaugeLengthMm, 'gaugeLengthMm');
  const mass = positive(test.hangingMassG, 'hangingMassG');
  if (!Number.isFinite(test.loadedLengthMm) || test.loadedLengthMm < gauge) {
    throw new RangeError('loadedLengthMm doit être fini et au moins gaugeLengthMm');
  }
  const measuredPercent = ((test.loadedLengthMm - gauge) / gauge) * 100;
  const tensionNPerMm = (mass * STANDARD_GRAVITY_M_PER_S2 * 1e-3) / width;
  const tensionRatio = tensionNPerMm / REFERENCE_STRIP_TENSION_N_PER_MM;
  return {
    measuredPercent,
    tensionNPerMm,
    tensionRatio,
    stretchPercent: measuredPercent / tensionRatio,
    extrapolated: tensionRatio < MIN_TENSION_RATIO || tensionRatio > MAX_TENSION_RATIO,
  };
}

/** Longueur de flexion c (mm) : porte-à-faux moyen / 2. */
export function bendingLengthMm(test: CantileverBendingTest): number {
  return mean(positiveSeries(test.overhangLengthsMm, 'overhangLengthsMm')) / 2;
}

/** Rigidité de flexion B (µN·m) = grammage (g/m²) × c³ (mm³) × 9,81e-6. */
export function bendingRigidityMicroNm(bendingLength: number, weightGPerM2: number): number {
  const c = positive(bendingLength, 'bendingLengthMm');
  return positive(weightGPerM2, 'weightGPerM2') * c ** 3 * STANDARD_GRAVITY_M_PER_S2 * 1e-6;
}

/** Coefficient de frottement statique : moyenne des tan θ (et non tan de la moyenne). */
export function frictionFromSlideAngles(test: InclinedPlaneFrictionTest): number {
  if (test.slideAnglesDeg.length === 0)
    throw new RangeError('slideAnglesDeg ne peut pas être vide');
  const tangents = test.slideAnglesDeg.map((deg) => {
    if (!Number.isFinite(deg) || deg <= 0 || deg >= 90) {
      throw new RangeError('slideAnglesDeg doit rester dans ]0 ; 90[ degrés');
    }
    return Math.tan((deg * Math.PI) / 180);
  });
  return mean(tangents);
}

type Bending = Pick<
  FabricDerivedValues,
  | 'bendingLengthWarpMm'
  | 'bendingLengthWeftMm'
  | 'bendingRigidityWarpMicroNm'
  | 'bendingRigidityWeftMicroNm'
  | 'bendingRigidityMicroNm'
  | 'bendingWeightSource'
>;

function deriveBending(
  m: FabricBenchMeasurements,
  weight: number,
  source: 'measured' | 'estimated',
): Bending {
  const out: Bending = {};
  if (!m.bendingWarp && !m.bendingWeft) return out;
  out.bendingWeightSource = source;
  let warp: number | undefined;
  let weft: number | undefined;
  if (m.bendingWarp) {
    const c = bendingLengthMm(m.bendingWarp);
    out.bendingLengthWarpMm = c;
    warp = bendingRigidityMicroNm(c, weight);
    out.bendingRigidityWarpMicroNm = warp;
  }
  if (m.bendingWeft) {
    const c = bendingLengthMm(m.bendingWeft);
    out.bendingLengthWeftMm = c;
    weft = bendingRigidityMicroNm(c, weight);
    out.bendingRigidityWeftMicroNm = weft;
  }
  out.bendingRigidityMicroNm =
    warp !== undefined && weft !== undefined ? Math.sqrt(warp * weft) : (warp ?? weft ?? 0);
  return out;
}

/** Grandeurs déduites : une grandeur n'est présente que si son essai est saisi. */
export function deriveFabricValues(
  measurements: FabricBenchMeasurements,
  estimated: FabricPhysics,
): FabricDerivedValues {
  const derived: FabricDerivedValues = {};
  const weighed = measurements.weighing ? grammageGPerM2(measurements.weighing) : undefined;
  if (weighed !== undefined) derived.weightGPerM2 = weighed;
  if (measurements.thickness) derived.thicknessMm = meanThicknessMm(measurements.thickness);
  if (measurements.stretchWarp)
    derived.stretchWarpPercent = stripStretch(measurements.stretchWarp).stretchPercent;
  if (measurements.stretchWeft)
    derived.stretchWeftPercent = stripStretch(measurements.stretchWeft).stretchPercent;
  const bendingWeight = weighed ?? estimated.weightGPerM2;
  Object.assign(
    derived,
    deriveBending(measurements, bendingWeight, weighed === undefined ? 'estimated' : 'measured'),
  );
  if (measurements.friction)
    derived.frictionCoefficient = frictionFromSlideAngles(measurements.friction);
  return derived;
}

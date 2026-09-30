// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

export interface CreateDesignVersionRequest {
  measurements: MeasurementSet;
  garment: GarmentRequest;
}
/**
 * Mesures du corps d'un client (ISO 8559-1), en millimètres entiers.
 */
export interface MeasurementSet {
  sex: 'female' | 'male';
  statureMm: number;
  neckGirthMm?: number;
  chestGirthMm: number;
  waistGirthMm: number;
  hipGirthMm: number;
  upperArmGirthMm?: number;
  wristGirthMm?: number;
  thighGirthMm?: number;
  kneeGirthMm?: number;
  calfGirthMm?: number;
  ankleGirthMm?: number;
  crotchHeightMm?: number;
}
/**
 * Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres.
 */
export interface GarmentRequest {
  type: 'straight-skirt';
  params: StraightSkirtParams;
}
export interface StraightSkirtParams {
  lengthMm: number;
  waistEaseMm?: number;
  hipEaseMm?: number;
  hemFlareMm?: number;
}

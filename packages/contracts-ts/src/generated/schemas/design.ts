// Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

/**
 * Type de vêtement connu de la plateforme (ADR 0010). Même valeur que GarmentRequest.type. Un type dont le tracé n'est pas encore livré est refusé par le moteur de patronage (problème garment-type-not-supported).
 */
export type GarmentType = 'straight-skirt' | 'circle-skirt' | 'trousers' | 'bodice';

export interface Design {
  id: string;
  organizationId: string;
  name: string;
  garmentType: GarmentType;
  createdAt: string;
  /**
   * 0 tant qu'aucune version n'existe.
   */
  latestVersionNumber: number;
}

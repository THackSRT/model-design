import { err, type Id, ok, type Result } from '@atelier/kernel';

export type DesignId = Id<'design'>;
export type OrganizationId = Id<'organization'>;
export type GarmentType = 'straight-skirt';

export const DESIGN_NAME_MAX_LENGTH = 120;

/** Un modèle : ce que le vêtement est. Ses versions portent les mesures et le patron calculé. */
export interface Design {
  readonly id: DesignId;
  readonly organizationId: OrganizationId;
  readonly name: string;
  readonly garmentType: GarmentType;
  readonly createdAt: Date;
  readonly latestVersionNumber: number;
}

export type DesignError =
  { kind: 'invalid-name'; detail: string } | { kind: 'garment-type-mismatch'; detail: string };

export interface NewDesign {
  id: DesignId;
  organizationId: OrganizationId;
  name: string;
  garmentType: GarmentType;
  now: Date;
}

export function createDesign(input: NewDesign): Result<Design, DesignError> {
  const name = input.name.trim();
  if (name.length === 0 || name.length > DESIGN_NAME_MAX_LENGTH) {
    return err({
      kind: 'invalid-name',
      detail: `Le nom doit faire de 1 à ${DESIGN_NAME_MAX_LENGTH} caractères.`,
    });
  }
  return ok({
    id: input.id,
    organizationId: input.organizationId,
    name,
    garmentType: input.garmentType,
    createdAt: input.now,
    latestVersionNumber: 0,
  });
}

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from .. import garment_type_schema


class Design(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: UUID
    organizationId: UUID
    name: str
    garmentType: garment_type_schema.GarmentType
    createdAt: AwareDatetime
    latestVersionNumber: int = Field(..., description="0 tant qu'aucune version n'existe.", ge=0)

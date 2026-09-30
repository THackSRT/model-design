# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field


class GarmentType(StrEnum):
    straight_skirt = "straight-skirt"


class Design(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: UUID
    organizationId: UUID
    name: str
    garmentType: GarmentType
    createdAt: AwareDatetime
    latestVersionNumber: int = Field(..., description="0 tant qu'aucune version n'existe.", ge=0)

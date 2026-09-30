# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class GarmentType(StrEnum):
    straight_skirt = "straight-skirt"


class CreateDesignRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str = Field(..., max_length=120, min_length=1)
    garmentType: GarmentType

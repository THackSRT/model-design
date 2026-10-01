# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from .. import garment_type_schema


class CreateDesignRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str = Field(..., max_length=120, min_length=1)
    garmentType: garment_type_schema.GarmentType

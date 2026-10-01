# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from ..drape import drape_result_schema


class DrapeCompleted(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    drapeId: UUID
    designId: UUID
    versionNumber: int = Field(..., ge=1)
    organizationId: UUID
    result: drape_result_schema.DrapeResult

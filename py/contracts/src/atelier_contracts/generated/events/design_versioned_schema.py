# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DesignVersioned(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    designId: UUID
    versionNumber: int = Field(..., ge=1)
    organizationId: UUID
    fingerprint: str = Field(..., pattern="^[a-f0-9]{64}$")
    engineVersion: str

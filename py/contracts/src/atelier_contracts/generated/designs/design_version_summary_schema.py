# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from .. import garment_request_schema


class DesignVersionSummary(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    number: int = Field(..., ge=1)
    createdAt: AwareDatetime
    fingerprint: str = Field(..., pattern="^[a-f0-9]{64}$")
    engineVersion: str = Field(
        ...,
        description="Version du moteur de patronage qui a tracé le patron (spec.engine.version).",
    )
    garment: garment_request_schema.GarmentRequest = Field(
        ..., description="Type de vêtement et paramètres demandés, tels qu'envoyés."
    )

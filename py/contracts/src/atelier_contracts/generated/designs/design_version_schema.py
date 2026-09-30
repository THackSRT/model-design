# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from .. import garment_request_schema, garment_spec_schema, measurement_set_schema


class DesignVersion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    designId: UUID
    number: int = Field(..., ge=1)
    createdAt: AwareDatetime
    measurements: measurement_set_schema.MeasurementSet
    garment: garment_request_schema.GarmentRequest
    fingerprint: str = Field(..., pattern="^[a-f0-9]{64}$")
    spec: garment_spec_schema.GarmentSpec

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from .. import garment_request_schema, measurement_set_schema


class CreateDesignVersionRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    measurements: measurement_set_schema.MeasurementSet
    garment: garment_request_schema.GarmentRequest

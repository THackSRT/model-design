# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .. import avatar_options_schema, garment_spec_schema, measurement_set_schema
from . import fabric_schema


class Quality(StrEnum):
    draft = "draft"
    standard = "standard"


class DrapeJob(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    drapeId: UUID
    organizationId: UUID
    designId: UUID
    versionNumber: int = Field(..., ge=1)
    spec: garment_spec_schema.GarmentSpec
    measurements: measurement_set_schema.MeasurementSet
    avatar: avatar_options_schema.AvatarOptions
    fabric: fabric_schema.Fabric
    quality: Quality = Field(
        ...,
        description="Finesse du maillage du vêtement : draft (arête de 25 mm), standard (arête de 15 mm).",
    )

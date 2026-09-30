# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from .. import garment_spec_schema
from . import finishing_options_schema, size_label_schema


class CutPatternRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    spec: garment_spec_schema.GarmentSpec
    finishing: finishing_options_schema.FinishingOptions | None = None
    sizeLabel: size_label_schema.SizeLabel | None = None

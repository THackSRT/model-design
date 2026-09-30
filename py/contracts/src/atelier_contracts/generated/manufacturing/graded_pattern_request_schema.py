# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from .. import garment_spec_schema
from . import finishing_options_schema, size_label_schema


class Alignment(StrEnum):
    origin = "origin"
    grainline = "grainline"


class SizedSpec(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    size: size_label_schema.SizeLabel
    spec: garment_spec_schema.GarmentSpec


class GradedPatternRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    baseSize: size_label_schema.SizeLabel = Field(
        ..., description="Taille de base : l'une des tailles de sizes."
    )
    sizes: list[SizedSpec] = Field(..., max_length=12, min_length=2)
    finishing: finishing_options_schema.FinishingOptions | None = None
    alignment: Alignment | None = Field(
        "origin",
        description="origin : pièces laissées dans leur repère (le moteur de patronage place le point de référence de gradation à l'origine). grainline : chaque pièce est translatée pour que le début de son droit fil coïncide avec celui de la taille de base.",
    )

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from .. import garment_spec_schema
from . import finishing_options_schema, size_label_schema


class Layout(StrEnum):
    single = "single"
    folded = "folded"


class FabricDirection(StrEnum):
    one_way = "one-way"
    two_way = "two-way"


class FabricLayout(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    fabricWidthMm: int = Field(..., description="Laize, lisières comprises.", ge=300, le=3200)
    layout: Layout | None = Field(
        "folded",
        description="single : tissu à plat, une épaisseur (les pièces sur pliure sont dépliées). folded : tissu plié en deux dans le droit fil, deux épaisseurs (une pièce placée donne une paire symétrique ; une pièce sur pliure pose son bord de pliure sur la pliure du tissu).",
    )
    direction: FabricDirection | None = "two-way"
    selvedgeMarginMm: int | None = Field(
        10, description="Marge laissée le long de chaque lisière.", ge=0, le=50
    )


class GarmentToCut(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    label: size_label_schema.SizeLabel = Field(
        ..., description="Taille ou repère du vêtement, reporté sur chaque placement."
    )
    spec: garment_spec_schema.GarmentSpec
    count: int | None = Field(1, description="Nombre d'exemplaires du vêtement.", ge=1, le=50)


class CuttingPlanRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    garments: list[GarmentToCut] = Field(..., max_length=20, min_length=1)
    finishing: finishing_options_schema.FinishingOptions | None = None
    fabric: FabricLayout
    spacingMm: int | None = Field(5, description="Écart minimal entre deux pièces.", ge=0, le=50)

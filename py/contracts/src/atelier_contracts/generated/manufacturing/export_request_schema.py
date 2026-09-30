# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from .. import garment_spec_schema
from . import finishing_options_schema, size_label_schema


class Locale(StrEnum):
    fr = "fr"


class ExportFormat(StrEnum):
    svg = "svg"
    pdf_a4_tiled = "pdf-a4-tiled"
    dxf_aama = "dxf-aama"


class ExportRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    format: ExportFormat
    spec: garment_spec_schema.GarmentSpec
    finishing: finishing_options_schema.FinishingOptions | None = None
    sizeLabel: size_label_schema.SizeLabel | None = None
    reference: size_label_schema.SizeLabel | None = Field(
        None,
        description="Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client.",
    )
    locale: Locale | None = Field(
        "fr", description="Langue des annotations (droit fil, pliure, « couper 2 × »)."
    )

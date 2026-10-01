# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..manufacturing import (
    export_request_schema,
    finishing_options_schema,
    size_label_schema,
)


class DesignExportRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    format: export_request_schema.ExportFormat
    finishing: finishing_options_schema.FinishingOptions | None = None
    sizeLabel: size_label_schema.SizeLabel | None = Field(
        None,
        description="Taille écrite sur chaque pièce et dans le nom du fichier. Jamais de nom de client.",
    )
    reference: size_label_schema.SizeLabel | None = Field(
        None,
        description="Référence du modèle écrite sur chaque pièce (ex. « MOD-002 »). Jamais de nom de client.",
    )

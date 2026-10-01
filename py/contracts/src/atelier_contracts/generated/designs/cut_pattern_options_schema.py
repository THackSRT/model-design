# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from ..manufacturing import finishing_options_schema, size_label_schema


class CutPatternOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    finishing: finishing_options_schema.FinishingOptions | None = None
    sizeLabel: size_label_schema.SizeLabel | None = Field(
        None,
        description="Taille ou repère reporté sur les pièces. Jamais de nom de client.",
    )

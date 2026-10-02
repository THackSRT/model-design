# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from typing import Literal

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from . import fabric_preset_review_schema


class FabricValidationReport(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    schemaVersion: Literal["1.0"]
    createdAt: AwareDatetime = Field(
        ..., description="Création du rapport, en UTC (suffixe Z).", pattern="Z$"
    )
    updatedAt: AwareDatetime = Field(
        ...,
        description="Dernier enregistrement du rapport, en UTC (suffixe Z).",
        pattern="Z$",
    )
    engineVersion: str = Field(
        ...,
        description="Version du moteur de drapé (@atelier/drape) dont viennent les valeurs estimées et les essais simulés du rapport.",
        max_length=64,
        min_length=1,
    )
    reviews: list[fabric_preset_review_schema.FabricPresetReview] = Field(
        ...,
        description="Une revue par préréglage, au plus une par valeur de preset (vérifié à l'import).",
        max_length=32,
        min_length=1,
    )

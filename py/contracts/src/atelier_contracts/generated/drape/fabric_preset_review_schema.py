# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from . import (
    fabric_bench_measurements_schema,
    fabric_derived_values_schema,
    fabric_physics_schema,
    fabric_schema,
)


class Verdict(StrEnum):
    validated = "validated"
    corrected = "corrected"
    to_review = "to-review"


class CusickSimulation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    fabric: fabric_physics_schema.FabricPhysics
    drapeCoefficient: float = Field(
        ...,
        description="Coefficient de drapé simulé, sans unité, borné à [0, 1].",
        ge=0.0,
        le=1.0,
    )
    converged: bool = Field(
        ...,
        description="Vrai si le tissu s'est immobilisé avant la fin de la simulation.",
    )
    simulatedSteps: int = Field(
        ..., description="Nombre de pas de simulation effectués.", ge=0, le=1000000
    )


class SimulatedDrapeTests(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    estimated: CusickSimulation | None = None
    candidate: CusickSimulation | None = None


class FabricPresetReview(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    preset: fabric_schema.Preset
    verdict: Verdict = Field(
        ...,
        description="validated : l'estimation est conservée ; corrected : les valeurs de corrected remplacent l'estimation ; to-review : à reprendre (mesures manquantes, doute).",
    )
    reviewedAt: AwareDatetime = Field(
        ...,
        description="Dernière modification de cette revue, en UTC (suffixe Z).",
        pattern="Z$",
    )
    estimated: fabric_physics_schema.FabricPhysics
    measurements: fabric_bench_measurements_schema.FabricBenchMeasurements | None = None
    derived: fabric_derived_values_schema.FabricDerivedValues | None = None
    corrected: fabric_physics_schema.FabricPhysics | None = None
    simulatedDrape: SimulatedDrapeTests | None = None
    comment: str | None = Field(
        None,
        description="Commentaire libre du modéliste, sur le tissu seulement : ni nom, ni coordonnées, ni donnée d'un client.",
        max_length=500,
    )

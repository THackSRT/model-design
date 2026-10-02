# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class BendingWeightSource(StrEnum):
    measured = "measured"
    estimated = "estimated"


class FabricDerivedValues(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    weightGPerM2: float | None = Field(
        None, description="Grammage, en grammes par mètre carré.", ge=0.0
    )
    thicknessMm: float | None = Field(
        None, description="Épaisseur moyenne, en millimètres.", ge=0.0
    )
    stretchWarpPercent: float | None = Field(
        None,
        description="Allongement chaîne ramené à 10 N sur 50 mm de large, en pourcentage.",
        ge=0.0,
    )
    stretchWeftPercent: float | None = Field(
        None,
        description="Allongement trame ramené à 10 N sur 50 mm de large, en pourcentage.",
        ge=0.0,
    )
    bendingLengthWarpMm: float | None = Field(
        None,
        description="Longueur de flexion dans le sens chaîne (porte-à-faux moyen / 2), en millimètres.",
        ge=0.0,
    )
    bendingLengthWeftMm: float | None = Field(
        None,
        description="Longueur de flexion dans le sens trame, en millimètres.",
        ge=0.0,
    )
    bendingRigidityWarpMicroNm: float | None = Field(
        None, description="Rigidité de flexion par unité de largeur, sens chaîne, en µN·m.", ge=0.0
    )
    bendingRigidityWeftMicroNm: float | None = Field(
        None, description="Rigidité de flexion par unité de largeur, sens trame, en µN·m.", ge=0.0
    )
    bendingRigidityMicroNm: float | None = Field(
        None,
        description="Rigidité de flexion retenue, en µN·m : moyenne géométrique chaîne et trame, ou le seul sens mesuré (le moteur de drapé a une flexion isotrope).",
        ge=0.0,
    )
    bendingWeightSource: BendingWeightSource | None = Field(
        None,
        description="Grammage utilisé pour la rigidité de flexion : measured (pesée saisie) ou estimated (grammage du préréglage, faute de pesée).",
    )
    frictionCoefficient: float | None = Field(
        None,
        description="Coefficient de frottement statique (moyenne des tan θ), sans unité.",
        ge=0.0,
    )

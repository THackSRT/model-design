# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field, RootModel


class Preset(StrEnum):
    cotton_poplin = "cotton-poplin"
    cotton_wax = "cotton-wax"
    bazin = "bazin"
    linen = "linen"
    denim = "denim"
    silk_satin = "silk-satin"
    jersey = "jersey"


class Fabric(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    preset: Preset
    weightGPerM2: float | None = Field(
        None, description="Grammage, en grammes par mètre carré.", ge=20.0, le=800.0
    )
    thicknessMm: float | None = Field(
        None, description="Épaisseur, en millimètres.", ge=0.1, le=5.0
    )
    stretchWarpPercent: float | None = Field(
        None,
        description="Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.",
        ge=0.0,
        le=100.0,
    )
    stretchWeftPercent: float | None = Field(
        None,
        description="Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.",
        ge=0.0,
        le=100.0,
    )
    bendingRigidityMicroNm: float | None = Field(
        None,
        description="Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).",
        ge=0.1,
        le=5000.0,
    )
    frictionCoefficient: float | None = Field(
        None,
        description="Coefficient de frottement du tissu sur le corps (sans unité).",
        ge=0.0,
        le=1.5,
    )


class BendingRigidityMicroNm(RootModel[float]):
    root: float = Field(
        ...,
        description="Rigidité de flexion par unité de largeur (valeur B de Kawabata), en micronewtons-mètres (µN·m ; 1 gf·cm²/cm ≈ 98 µN·m).",
        ge=0.1,
        le=5000.0,
    )


class FrictionCoefficient(RootModel[float]):
    root: float = Field(
        ...,
        description="Coefficient de frottement du tissu sur le corps (sans unité).",
        ge=0.0,
        le=1.5,
    )


class StretchWarpPercent(RootModel[float]):
    root: float = Field(
        ...,
        description="Allongement dans le sens de la chaîne (droit fil) sous 10 N sur une bande de 50 mm de large, en pourcentage.",
        ge=0.0,
        le=100.0,
    )


class StretchWeftPercent(RootModel[float]):
    root: float = Field(
        ...,
        description="Allongement dans le sens de la trame sous 10 N sur une bande de 50 mm de large, en pourcentage.",
        ge=0.0,
        le=100.0,
    )


class ThicknessMm(RootModel[float]):
    root: float = Field(..., description="Épaisseur, en millimètres.", ge=0.1, le=5.0)


class WeightGPerM2(RootModel[float]):
    root: float = Field(..., description="Grammage, en grammes par mètre carré.", ge=20.0, le=800.0)

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class StraightSkirtParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthMm: int = Field(..., ge=300, le=1300)
    waistEaseMm: int | None = Field(10, ge=0, le=80)
    hipEaseMm: int | None = Field(40, ge=0, le=200)
    hemFlareMm: int | None = Field(0, ge=0, le=200)


class WaistbandWidthMm(RootModel[int]):
    root: int = Field(0, description="Hauteur de la ceinture ; 0 : sans ceinture.", ge=20, le=80)


class CircleSkirtParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthMm: int = Field(..., description="De la taille à l'ourlet.", ge=300, le=1300)
    waistEaseMm: int | None = Field(10, ge=0, le=80)
    circleFraction: float | None = Field(
        1,
        description="Fraction de cercle de l'ourlet : 1 pour un cercle entier, 0,5 pour un demi-cercle (suns de GarmentCode).",
        ge=0.25,
        le=1.0,
    )
    waistbandWidthMm: Literal[0] | WaistbandWidthMm | None = Field(
        0,
        description="Hauteur de la ceinture ; 0 : sans ceinture.",
        validate_default=True,
    )


class TrousersParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthMm: int = Field(..., description="De la taille à l'ourlet, sur le côté.", ge=300, le=1300)
    waistEaseMm: int | None = Field(10, ge=0, le=80)
    hipEaseMm: int | None = Field(50, ge=20, le=200)
    hemGirthMm: int | None = Field(
        None,
        description="Tour du bas de jambe. Absent : jambe droite depuis le genou.",
        ge=250,
        le=900,
    )


class SleeveParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthMm: int = Field(..., description="Du point d'épaule à l'ourlet.", ge=100, le=900)
    capEaseMm: int | None = Field(
        15,
        description="Embu de la tête de manche : la tête est plus longue que l'emmanchure de cette valeur.",
        ge=0,
        le=40,
    )
    hemGirthMm: int | None = Field(
        None,
        description="Tour du bas de manche. Absent : valeur choisie par le tracé.",
        ge=150,
        le=600,
    )


class StraightSkirtRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["straight-skirt"]
    params: StraightSkirtParams


class CircleSkirtRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["circle-skirt"]
    params: CircleSkirtParams


class TrousersRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["trousers"]
    params: TrousersParams


class BodiceParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthBelowWaistMm: int | None = Field(
        0, description="Longueur sous la taille ; 0 : arrêt à la taille.", ge=0, le=400
    )
    bustEaseMm: int | None = Field(60, ge=0, le=200)
    waistEaseMm: int | None = Field(40, ge=0, le=200)
    frontNeckDepthMm: int | None = Field(
        0,
        description="Creusement de l'encolure devant sous l'encolure naturelle ; 0 : encolure naturelle.",
        ge=0,
        le=250,
    )
    backNeckDepthMm: int | None = Field(
        0,
        description="Creusement de l'encolure dos sous l'encolure naturelle ; 0 : encolure naturelle.",
        ge=0,
        le=250,
    )
    sleeve: SleeveParams | None = Field(None, description="Manches. Absent : sans manches.")


class BodiceRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Literal["bodice"]
    params: BodiceParams


class GarmentRequest(
    RootModel[StraightSkirtRequest | CircleSkirtRequest | TrousersRequest | BodiceRequest]
):
    root: StraightSkirtRequest | CircleSkirtRequest | TrousersRequest | BodiceRequest = Field(
        ...,
        description="Ce que l'on demande au moteur de patronage : un type de vêtement et ses paramètres, qui dépendent du type. Longueurs en millimètres.",
        title="GarmentRequest",
    )

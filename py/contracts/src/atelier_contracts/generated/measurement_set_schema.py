# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Sex(StrEnum):
    female = "female"
    male = "male"


class MeasurementSet(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    sex: Sex
    statureMm: int = Field(..., ge=900, le=2300)
    neckGirthMm: int | None = Field(None, ge=250, le=600)
    chestGirthMm: int = Field(..., ge=500, le=1800)
    waistGirthMm: int = Field(..., ge=400, le=1800)
    hipGirthMm: int = Field(..., ge=600, le=1900)
    upperArmGirthMm: int | None = Field(None, ge=150, le=600)
    wristGirthMm: int | None = Field(None, ge=110, le=260)
    thighGirthMm: int | None = Field(None, ge=300, le=1000)
    kneeGirthMm: int | None = Field(None, ge=250, le=600)
    calfGirthMm: int | None = Field(None, ge=220, le=600)
    ankleGirthMm: int | None = Field(None, ge=170, le=400)
    crotchHeightMm: int | None = Field(None, ge=400, le=1100)
    bustGirthMm: int | None = Field(
        None,
        description="Tour de poitrine sur les pointes de seins (ISO 8559-1 : bust girth).",
        ge=600,
        le=1800,
    )
    underBustGirthMm: int | None = Field(
        None,
        description="Tour de dessous de poitrine (ISO 8559-1 : underbust girth).",
        ge=500,
        le=1700,
    )
    cervicaleHeightMm: int | None = Field(
        None,
        description="Hauteur de la vertèbre cervicale saillante depuis le sol (ISO 8559-1 : cervicale height).",
        ge=700,
        le=2000,
    )
    waistHeightMm: int | None = Field(
        None,
        description="Hauteur de la taille depuis le sol (ISO 8559-1 : waist height).",
        ge=500,
        le=1400,
    )
    hipHeightMm: int | None = Field(
        None,
        description="Hauteur des hanches (tour le plus fort) depuis le sol (ISO 8559-1 : hip height).",
        ge=400,
        le=1200,
    )
    backWaistLengthMm: int | None = Field(
        None,
        description="Longueur taille dos : de la cervicale à la taille, le long de la colonne (ISO 8559-1 : back waist length).",
        ge=300,
        le=600,
    )
    frontWaistLengthMm: int | None = Field(
        None,
        description="Longueur taille devant : du point d'encolure à l'épaule à la taille, par la pointe de sein (ISO 8559-1 : front waist length).",
        ge=300,
        le=700,
    )
    neckShoulderToBustPointMm: int | None = Field(
        None,
        description="Du point d'encolure à l'épaule à la pointe de sein (ISO 8559-1 : neck shoulder point to bust point).",
        ge=150,
        le=450,
    )
    bustPointWidthMm: int | None = Field(
        None,
        description="Écart entre les pointes de seins (ISO 8559-1 : bust point width).",
        ge=100,
        le=300,
    )
    shoulderWidthMm: int | None = Field(
        None,
        description="Carrure d'épaule à épaule, d'un point d'épaule à l'autre, par le dos (ISO 8559-1 : shoulder width).",
        ge=250,
        le=550,
    )
    armscyeDepthMm: int | None = Field(
        None,
        description="Profondeur d'emmanchure : de la ligne d'épaule au niveau du dessous de bras (ISO 8559-1 : armscye depth).",
        ge=100,
        le=300,
    )
    armLengthMm: int | None = Field(
        None,
        description="Longueur de bras : du point d'épaule au poignet, coude légèrement plié (ISO 8559-1 : arm length).",
        ge=400,
        le=900,
    )

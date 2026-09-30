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

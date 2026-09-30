# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class Type(StrEnum):
    straight_skirt = "straight-skirt"


class StraightSkirtParams(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    lengthMm: int = Field(..., ge=300, le=1300)
    waistEaseMm: int | None = Field(10, ge=0, le=80)
    hipEaseMm: int | None = Field(40, ge=0, le=200)
    hemFlareMm: int | None = Field(0, ge=0, le=200)


class GarmentRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: Type
    params: StraightSkirtParams

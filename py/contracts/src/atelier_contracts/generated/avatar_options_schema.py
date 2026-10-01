# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class Morphotype(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    african: float = Field(..., ge=0.0, le=1.0)
    asian: float = Field(..., ge=0.0, le=1.0)
    caucasian: float = Field(..., ge=0.0, le=1.0)


class AvatarOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    age: int | None = Field(30, description="Âge en années. Défaut : 30.", ge=16, le=90)
    morphotype: Morphotype | None = Field(
        None,
        description="Proportions de morphotype, de 0 à 1 chacune (normalisées par le moteur mannequin ; somme nulle : africain). Défaut : africain (1, 0, 0).",
    )
    armAngleDeg: float | None = Field(
        9,
        description="Bras abaissés depuis l'horizontale, en degrés. Défaut : 9.",
        ge=0.0,
        le=45.0,
    )

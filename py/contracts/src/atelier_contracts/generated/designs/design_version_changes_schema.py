# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from . import design_version_summary_schema


class ParamChange(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    path: str = Field(
        ...,
        description="Chemin du paramètre dans GarmentRequest.params, points entre les niveaux (ex. lengthMm, sleeve.capEaseMm).",
        max_length=120,
        pattern="^[a-z][A-Za-z0-9]*([.][a-z][A-Za-z0-9]*)*$",
    )
    from_: float | str | bool | None = Field(
        None,
        alias="from",
        description="Valeur dans la version from. Absent : paramètre absent (défaut du moteur).",
    )
    to: float | str | bool | None = Field(
        None,
        description="Valeur dans la version to. Absent : paramètre absent (défaut du moteur).",
    )


class MeasurementChange(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str = Field(
        ...,
        description="Nom de champ de MeasurementSet (ex. waistGirthMm).",
        max_length=64,
        pattern="^[a-z][A-Za-z0-9]*$",
    )
    from_: int | str | None = Field(
        None,
        alias="from",
        description="Valeur dans la version from (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).",
    )
    to: int | str | None = Field(
        None,
        description="Valeur dans la version to (mm, ou sexe). Absent : mesure non fournie (estimée par le moteur si besoin).",
    )


class DesignVersionChanges(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    designId: UUID
    from_: design_version_summary_schema.DesignVersionSummary = Field(..., alias="from")
    to: design_version_summary_schema.DesignVersionSummary
    sameFingerprint: bool = Field(
        ...,
        description="Vrai si les deux versions ont la même empreinte : mêmes mesures, mêmes paramètres, même version du moteur, donc même patron.",
    )
    params: list[ParamChange] = Field(
        ..., description="Paramètres différents, triés par chemin.", max_length=100
    )
    measurements: list[MeasurementChange] = Field(
        ..., description="Mesures différentes, triées par nom.", max_length=100
    )

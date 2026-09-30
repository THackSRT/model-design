# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class AutoNotches(StrEnum):
    none = "none"
    seam_junctions = "seam-junctions"


class RoleAllowances(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    seam: int | None = Field(None, ge=0, le=100)
    hem: int | None = Field(None, ge=0, le=100)
    waistline: int | None = Field(None, ge=0, le=100)
    opening: int | None = Field(None, ge=0, le=100)


class EdgeAllowance(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    edgeId: str
    allowanceMm: int = Field(..., ge=0, le=100)


class NotchRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    edgeId: str
    distanceMm: float = Field(..., ge=0.0, le=10000.0)
    count: int | None = Field(
        1,
        description="Cran simple, double (dos, par convention) ou triple.",
        ge=1,
        le=3,
    )


class SeamAllowances(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    defaultMm: int | None = Field(10, ge=0, le=100)
    byRole: RoleAllowances | None = None
    byEdge: list[EdgeAllowance] | None = Field(None, max_length=500)


class FinishingOptions(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    seamAllowances: SeamAllowances | None = None
    notches: list[NotchRequest] | None = Field(
        None,
        description="Crans demandés en plus des crans automatiques.",
        max_length=200,
    )
    autoNotches: AutoNotches | None = Field(
        "seam-junctions",
        description="none : aucun cran automatique. seam-junctions : un cran à chaque jonction de deux bords cousus presque alignés (écart de direction inférieur à 30°), par exemple la ligne de hanches d'une couture de côté.",
    )

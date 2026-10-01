# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class Engine(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str
    version: str


class Garment(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: str


class Point(RootModel[list[float]]):
    root: list[float] = Field(..., description="[x, y] en millimètres.", max_length=2, min_length=2)


class Role(StrEnum):
    seam = "seam"
    fold = "fold"
    hem = "hem"
    waistline = "waistline"
    opening = "opening"


class Edge(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    from_: Point = Field(..., alias="from")
    to: Point
    controls: list[Point] | None = Field(
        None,
        description="Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit.",
        max_length=2,
    )
    role: Role | None = None


class EdgeRef(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    edgeId: str


class Seam(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    a: EdgeRef
    b: EdgeRef
    easeMm: float | None = Field(
        None,
        description="Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur.",
        ge=0.0,
        le=50.0,
    )


class NotchPlacement(BaseModel):
    edgeId: str
    distanceMm: float = Field(..., ge=0.0, le=10000.0)
    count: int | None = Field(
        1,
        description="Cran simple, double (dos, par convention) ou triple.",
        ge=1,
        le=3,
    )


class Notch(NotchPlacement):
    model_config = ConfigDict(
        extra="forbid",
    )


class Panel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    name: str
    edges: list[Edge] = Field(
        ...,
        description="Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant.",
        min_length=3,
    )
    grainline: list[Point] | None = Field(
        None, description="Droit fil : deux points.", max_length=2, min_length=2
    )
    quantity: int = Field(..., description="Nombre de pièces à couper.", ge=1)
    cutOnFold: bool | None = False
    notches: list[Notch] | None = Field(
        None,
        description="Crans posés par le moteur de patronage (tête de manche, ligne des hanches, milieux).",
        max_length=200,
    )


class GarmentSpec(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    specVersion: Literal["1.0"]
    unit: Literal["mm"]
    engine: Engine
    garment: Garment
    panels: list[Panel] = Field(..., min_length=1)
    seams: list[Seam]
    estimatedMeasurements: list[str] | None = Field(
        None,
        description="Mesures absentes de la demande, estimées par le moteur : noms de champs de MeasurementSet (ex. bustGirthMm). Absent ou vide : aucune estimation.",
    )

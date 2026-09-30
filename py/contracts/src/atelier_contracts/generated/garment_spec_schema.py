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

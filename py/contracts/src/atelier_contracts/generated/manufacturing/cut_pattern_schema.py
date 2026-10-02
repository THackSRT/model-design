# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel

from . import size_label_schema


class Garment(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: str


class Point(RootModel[list[float]]):
    root: list[float] = Field(
        ...,
        description="[x, y] en millimètres, dans le repère de la pièce. Sortie du moteur, non bornée : la ligne de coupe dépasse la ligne de couture des valeurs de couture ; les points d'entrée (GarmentSpec) sont bornés à 10 000 mm.",
        max_length=2,
        min_length=2,
    )


class EngineRef(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str
    version: str


class Segment(RootModel[list[Point]]):
    root: list[Point] = Field(
        ..., description="Segment de deux points.", max_length=2, min_length=2
    )


class Role(StrEnum):
    seam = "seam"
    fold = "fold"
    hem = "hem"
    waistline = "waistline"
    opening = "opening"


class SeamLineEdge(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edgeId: str
    role: Role = Field(..., description="Rôle du bord (Edge.role de GarmentSpec ; seam si absent).")
    allowanceMm: int = Field(
        ...,
        description="Valeur de couture appliquée à ce bord (0 pour une pliure).",
        ge=0,
    )
    points: list[Point] = Field(
        ...,
        description="Polyligne du bord (courbe de Bézier aplatie), du début à la fin.",
        min_length=2,
    )


class Source(StrEnum):
    requested = "requested"
    auto = "auto"


class NotchMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edgeId: str
    distanceMm: float = Field(
        ...,
        description="Distance le long de la ligne de couture depuis le début du bord.",
        ge=0.0,
    )
    count: int = Field(..., ge=1, le=3)
    source: Source | None = None
    position: Point = Field(..., description="Point de la ligne de couture repéré par le cran.")
    segments: list[Segment] = Field(
        ...,
        description="Entailles à couper (une par cran), de la ligne de coupe vers l'intérieur de la pièce.",
        max_length=3,
        min_length=1,
    )


class Bounds(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    min: Point
    max: Point


class CutPiece(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    name: str
    quantity: int = Field(
        ...,
        description="Nombre de pièces à couper par vêtement (Panel.quantity).",
        ge=1,
    )
    cutOnFold: bool = Field(
        ...,
        description="Vrai : la pièce est dessinée à moitié et se coupe sur la pliure du tissu (voir foldLine).",
    )
    cutLine: list[Point] = Field(
        ...,
        description="Ligne de coupe : polygone fermé (le dernier point rejoint le premier, sans être répété), sens trigonométrique, courbes aplaties.",
        min_length=3,
    )
    seamLine: list[SeamLineEdge] = Field(
        ...,
        description="Ligne de couture, bord par bord, dans l'ordre de Panel.edges ; la fin de chaque bord est le début du suivant.",
        min_length=3,
    )
    notches: list[NotchMark]
    grainline: Segment = Field(
        ...,
        description="Droit fil : celui de la spécification, ou, s'il manque, une ligne verticale (axe y de la pièce) au centre de la pièce.",
    )
    foldLine: Segment | None = Field(
        None,
        description="Ligne de pliure (bord de rôle fold), présente si cutOnFold est vrai.",
    )
    labelAnchor: Point = Field(
        ..., description="Point intérieur à la pièce où placer son étiquette."
    )
    bounds: Bounds
    cutAreaMm2: float = Field(
        ...,
        description="Aire de la ligne de coupe, en mm², telle que dessinée (moitié de pièce si cutOnFold).",
        ge=0.0,
    )


class CutPattern(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    unit: Literal["mm"]
    engine: EngineRef
    specEngine: EngineRef = Field(
        ...,
        description="Moteur qui a calculé la spécification d'entrée (GarmentSpec.engine).",
    )
    garment: Garment
    sizeLabel: size_label_schema.SizeLabel | None = None
    pieces: list[CutPiece] = Field(..., min_length=1)

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


class PointItem(RootModel[float]):
    root: float = Field(..., ge=-10000.0, le=10000.0)


class Point(RootModel[list[PointItem]]):
    root: list[PointItem] = Field(
        ...,
        description="[x, y] en millimètres, chaque coordonnée entre -10 000 et 10 000 mm (10 m, bornes comprises) : un vêtement réel tient sous 3 m ; la borne refuse une entrée hostile dès la validation (ADR 0013, MAX_COORDINATE_MM du drapé).",
        max_length=2,
        min_length=2,
    )


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


class Zone(StrEnum):
    torso = "torso"
    leg = "leg"
    arm = "arm"


class BodySide(StrEnum):
    left = "left"
    right = "right"
    center = "center"


class Facing(StrEnum):
    front = "front"
    back = "back"
    outer = "outer"


class Landmark(StrEnum):
    neck = "neck"
    shoulder = "shoulder"
    waist = "waist"
    hip = "hip"
    crotch = "crotch"
    knee = "knee"
    ankle = "ankle"
    wrist = "wrist"


class Anchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    point: Point
    landmark: Landmark = Field(..., description="Repère de hauteur du corps ajusté.")
    offsetMm: float | None = Field(
        0,
        description="Décalage vertical depuis le repère, en millimètres, positif vers le haut.",
        ge=-500.0,
        le=500.0,
    )


class PanelPlacement(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    zone: Zone = Field(..., description="Partie du corps autour de laquelle la pièce s'enroule.")
    bodySide: BodySide = Field(
        ...,
        description="Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.",
    )
    facing: Facing = Field(
        ...,
        description="Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.",
    )
    anchor: Anchor = Field(
        ...,
        description="Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm.",
    )
    clearanceMm: float | None = Field(
        30,
        description="Distance au corps de la position de départ, en millimètres.",
        ge=5.0,
        le=150.0,
    )


class Side(StrEnum):
    left = "left"
    right = "right"


class EdgeRef(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    edgeId: str
    side: Side | None = Field(
        None,
        description="Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.",
    )


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
    placement: PanelPlacement | None = None


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

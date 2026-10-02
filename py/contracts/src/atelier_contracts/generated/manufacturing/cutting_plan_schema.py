# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel

from . import cut_pattern_schema, size_label_schema


class Layout(StrEnum):
    single = "single"
    folded = "folded"


class Direction(StrEnum):
    one_way = "one-way"
    two_way = "two-way"


class Point(RootModel[list[float]]):
    root: list[float] = Field(
        ...,
        description="[x, y] en millimètres, dans le repère du plan. Non borné : x va jusqu'au métrage (fabricLengthMm), qui dépasse 10 m pour une série ; les points d'entrée (GarmentSpec) sont bornés à 10 000 mm.",
        max_length=2,
        min_length=2,
    )


class Placement(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    garmentLabel: size_label_schema.SizeLabel
    panelId: str
    copy_: int = Field(
        ...,
        alias="copy",
        description="Numéro de placement de cette pièce pour ce vêtement (à partir de 1).",
        ge=1,
    )
    plies: int = Field(
        ...,
        description="Pièces obtenues par ce placement : 2 sur tissu plié, 1 sinon ou pour une pièce sur pliure.",
        ge=1,
        le=2,
    )
    rotationDeg: float = Field(
        ...,
        description="Rotation appliquée à la pièce (repère de GarmentSpec) pour aligner son droit fil sur x, plus 180° si la pièce est retournée.",
        ge=0.0,
        lt=360.0,
    )
    mirrored: bool = Field(
        ...,
        description="Vrai : la pièce est placée en symétrique (paire gauche / droite sur tissu à plat).",
    )
    onFold: bool = Field(
        ...,
        description="Vrai : le bord de pliure de la pièce est posé sur la pliure du tissu (y = 0).",
    )
    outline: list[Point] = Field(
        ...,
        description="Ligne de coupe placée, dans le repère du plan (dépliée si la pièce sur pliure est coupée à plat).",
        min_length=3,
    )


class CuttingPlan(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    unit: Literal["mm"]
    engine: cut_pattern_schema.EngineRef
    fabricWidthMm: int = Field(..., ge=300)
    usableWidthMm: float = Field(
        ...,
        description="Largeur où l'on place les pièces : laize moins les marges de lisière, divisée par deux si le tissu est plié.",
        ge=0.0,
    )
    layout: Layout
    direction: Direction
    fabricLengthMm: int = Field(
        ...,
        description="Métrage : longueur de tissu à couper, arrondie au millimètre supérieur.",
        ge=0,
    )
    efficiency: float = Field(
        ...,
        description="Aire des pièces placées divisée par l'aire utilisée (usableWidthMm × fabricLengthMm), de 0 à 1, arrondie à 4 décimales.",
        ge=0.0,
        le=1.0,
    )
    pieceCount: int = Field(..., description="Nombre de pièces obtenues à la coupe.", ge=0)
    surplusPieceCount: int = Field(
        ...,
        description="Pièces coupées en trop (quantité impaire sur tissu plié).",
        ge=0,
    )
    placements: list[Placement]

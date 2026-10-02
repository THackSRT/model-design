# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from . import cut_pattern_schema, size_label_schema


class SizedCutPattern(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    size: size_label_schema.SizeLabel
    pieces: list[cut_pattern_schema.CutPiece] = Field(..., min_length=1)


class SizeDelta(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    size: size_label_schema.SizeLabel
    dxMm: float
    dyMm: float


class VertexGradeRule(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edgeId: str
    deltas: list[SizeDelta] = Field(
        ...,
        description="Écart de ce sommet pour chaque taille par rapport à la taille de base (0 pour la base), dans l'ordre des tailles.",
    )


class PanelGradeRule(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    vertices: list[VertexGradeRule] = Field(
        ...,
        description="Un sommet par bord : le début (from) du bord edgeId, sur la ligne de couture.",
    )


class GradedPattern(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    unit: Literal["mm"]
    engine: cut_pattern_schema.EngineRef
    baseSize: size_label_schema.SizeLabel
    sizes: list[SizedCutPattern] = Field(
        ..., description="Dans l'ordre de la demande.", min_length=2
    )
    gradeRules: list[PanelGradeRule] = Field(
        ..., description="Une entrée par pièce, dans l'ordre des pièces."
    )

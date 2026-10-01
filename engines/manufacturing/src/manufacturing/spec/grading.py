"""Conversions contrat <-> cœur pour la gradation."""

from typing import Any

from atelier_contracts.generated.manufacturing import graded_pattern_schema as out
from atelier_contracts.generated.manufacturing.graded_pattern_request_schema import (
    GradedPatternRequest,
)
from manufacturing import ENGINE_NAME, ENGINE_VERSION
from manufacturing.core.grading import Alignment, GradedResult, SizedPattern
from manufacturing.core.model import FinishingSettings
from manufacturing.spec.cut_patterns import (
    piece_to_dict,
    to_notch_requests,
    to_pattern,
    to_policy,
    wants_auto_notches,
)


def to_sized_patterns(request: GradedPatternRequest) -> list[SizedPattern]:
    return [SizedPattern(s.size.root, to_pattern(s.spec)) for s in request.sizes]


def to_alignment(request: GradedPatternRequest) -> Alignment:
    """Le modèle généré rend la valeur par défaut en `str`, les autres en énumération."""
    raw = request.alignment
    return Alignment(getattr(raw, "value", raw) or Alignment.ORIGIN)


def to_settings(request: GradedPatternRequest) -> FinishingSettings:
    finishing = request.finishing
    return FinishingSettings(
        to_policy(finishing), to_notch_requests(finishing), wants_auto_notches(finishing)
    )


def _rule(names: list[str], rule: Any) -> dict[str, Any]:
    return {
        "panelId": rule.panel_id,
        "vertices": [
            {
                "edgeId": v.edge_id,
                "deltas": [
                    {"size": n, "dxMm": dx, "dyMm": dy}
                    for n, (dx, dy) in zip(names, v.deltas, strict=True)
                ],
            }
            for v in rule.vertices
        ],
    }


def to_graded_pattern(request: GradedPatternRequest, result: GradedResult) -> out.GradedPattern:
    names = [s.size for s in result.sizes]
    return out.GradedPattern.model_validate(
        {
            "unit": "mm",
            "engine": {"name": ENGINE_NAME, "version": ENGINE_VERSION},
            "baseSize": request.baseSize.root,
            "sizes": [
                {
                    "size": s.size,
                    "pieces": [piece_to_dict(p, p.outline.panel_id) for p in s.pieces],
                }
                for s in result.sizes
            ],
            "gradeRules": [_rule(names, rule) for rule in result.rules],
        }
    )


def to_response(request: GradedPatternRequest, result: GradedResult) -> dict[str, Any]:
    graded = to_graded_pattern(request, result)
    return graded.model_dump(by_alias=True, exclude_none=True, mode="json")

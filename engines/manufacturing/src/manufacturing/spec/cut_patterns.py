"""Conversions contrat <-> cœur pour les pièces de coupe. Seul endroit qui connaît les contrats."""

from typing import Any

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from atelier_contracts.generated.manufacturing import cut_pattern_schema as out
from atelier_contracts.generated.manufacturing.cut_pattern_request_schema import (
    CutPatternRequest,
)
from atelier_contracts.generated.manufacturing.finishing_options_schema import (
    AutoNotches,
    FinishingOptions,
)
from manufacturing import ENGINE_NAME, ENGINE_VERSION
from manufacturing.core.model import (
    DEFAULT_HEM_ALLOWANCE_MM,
    DEFAULT_POLICY,
    DEFAULT_SEAM_ALLOWANCE_MM,
    AllowancePolicy,
    CutPiece,
    Edge,
    EdgeRole,
    NotchMark,
    NotchPlacement,
    NotchRequest,
    Panel,
    Pattern,
    Point,
    Seam,
)


def _point(raw: Any) -> Point:
    return (float(raw.root[0]), float(raw.root[1]))


def _placement(raw: Any) -> NotchPlacement:
    return NotchPlacement(raw.edgeId, float(raw.distanceMm), raw.count or 1)


def _edge(edge: Any) -> Edge:
    return Edge(
        id=edge.id,
        start=_point(edge.from_),
        end=_point(edge.to),
        controls=tuple(_point(c) for c in edge.controls or ()),
        role=EdgeRole(edge.role.value) if edge.role else EdgeRole.SEAM,
    )


def _panel(panel: Any) -> Panel:
    grain = panel.grainline
    return Panel(
        id=panel.id,
        name=panel.name,
        edges=tuple(_edge(e) for e in panel.edges),
        grainline=(_point(grain[0]), _point(grain[1])) if grain else None,
        quantity=panel.quantity,
        cut_on_fold=bool(panel.cutOnFold),
        notches=tuple(_placement(n) for n in panel.notches or ()),
    )


def to_pattern(spec: GarmentSpec) -> Pattern:
    """`Seam.easeMm` et `estimatedMeasurements` ne servent pas à la finition : ignorés."""
    seams = tuple(
        Seam(s.id, (s.a.panelId, s.a.edgeId), (s.b.panelId, s.b.edgeId)) for s in spec.seams
    )
    return Pattern(spec.garment.type, tuple(_panel(p) for p in spec.panels), seams)


def to_policy(finishing: FinishingOptions | None) -> AllowancePolicy:
    """Valeurs absentes : 10 mm partout et 30 mm aux ourlets (contrat)."""
    allowances = finishing.seamAllowances if finishing else None
    if allowances is None:
        return DEFAULT_POLICY
    default = allowances.defaultMm
    by_role = {EdgeRole.HEM: DEFAULT_HEM_ALLOWANCE_MM}
    if allowances.byRole:
        given = allowances.byRole.model_dump(exclude_none=True)
        by_role.update({EdgeRole(role): float(value) for role, value in given.items()})
    return AllowancePolicy(
        default_mm=float(default if default is not None else DEFAULT_SEAM_ALLOWANCE_MM),
        by_role=by_role,
        by_edge={(e.panelId, e.edgeId): float(e.allowanceMm) for e in allowances.byEdge or ()},
    )


def to_notch_requests(finishing: FinishingOptions | None) -> tuple[NotchRequest, ...]:
    notches = finishing.notches if finishing and finishing.notches else []
    return tuple(NotchRequest(n.panelId, _placement(n)) for n in notches)


def wants_auto_notches(finishing: FinishingOptions | None) -> bool:
    return not (finishing and finishing.autoNotches is AutoNotches.none)


def _pt(p: Point) -> list[float]:
    return [p[0], p[1]]


def _notch(mark: NotchMark) -> dict[str, Any]:
    return {
        "edgeId": mark.edge_id,
        "distanceMm": mark.distance_mm,
        "count": mark.count,
        "source": mark.source.value,
        "position": _pt(mark.position),
        "segments": [[_pt(a), _pt(b)] for a, b in mark.segments],
    }


def piece_to_dict(piece: CutPiece, panel_id: str) -> dict[str, Any]:
    data: dict[str, Any] = {
        "panelId": panel_id,
        "name": piece.name,
        "quantity": piece.quantity,
        "cutOnFold": piece.cut_on_fold,
        "cutLine": [_pt(p) for p in piece.outline.cut_line],
        "seamLine": [
            {
                "edgeId": e.edge_id,
                "role": e.role.value,
                "allowanceMm": round(e.allowance_mm),
                "points": [_pt(p) for p in e.points],
            }
            for e in piece.outline.seam_edges
        ],
        "notches": [_notch(n) for n in piece.notches],
        "grainline": [_pt(piece.grainline[0]), _pt(piece.grainline[1])],
        "labelAnchor": _pt(piece.label_anchor),
        "bounds": {"min": _pt(piece.bounds[0]), "max": _pt(piece.bounds[1])},
        "cutAreaMm2": piece.cut_area_mm2,
    }
    if piece.fold_line:
        data["foldLine"] = [_pt(piece.fold_line[0]), _pt(piece.fold_line[1])]
    return data


def to_cut_pattern(
    request: CutPatternRequest, pattern: Pattern, pieces: tuple[CutPiece, ...]
) -> out.CutPattern:
    return out.CutPattern.model_validate(
        {
            "unit": "mm",
            "engine": {"name": ENGINE_NAME, "version": ENGINE_VERSION},
            "specEngine": {
                "name": request.spec.engine.name,
                "version": request.spec.engine.version,
            },
            "garment": {"type": pattern.garment_type},
            "sizeLabel": request.sizeLabel.root if request.sizeLabel else None,
            "pieces": [piece_to_dict(p, p.outline.panel_id) for p in pieces],
        }
    )

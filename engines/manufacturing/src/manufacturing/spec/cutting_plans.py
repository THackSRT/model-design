"""Conversions contrat <-> cœur pour le plan de coupe. Seul endroit qui connaît ces contrats."""

from typing import Any

from atelier_contracts.generated.manufacturing import cutting_plan_schema as out
from atelier_contracts.generated.manufacturing.cutting_plan_request_schema import (
    CuttingPlanRequest,
)
from manufacturing import ENGINE_NAME, ENGINE_VERSION
from manufacturing.core.cutting_plan import (
    CuttingPlan,
    Direction,
    Fabric,
    GarmentToCut,
    Layout,
    PlacedPiece,
)
from manufacturing.core.model import FinishingSettings
from manufacturing.spec.cut_patterns import (
    to_notch_requests,
    to_pattern,
    to_policy,
    wants_auto_notches,
)

DEFAULT_SPACING_MM = 5
DEFAULT_SELVEDGE_MARGIN_MM = 10


def to_garments(request: CuttingPlanRequest) -> tuple[GarmentToCut, ...]:
    return tuple(
        GarmentToCut(g.label.root, to_pattern(g.spec), g.count or 1) for g in request.garments
    )


def to_fabric(request: CuttingPlanRequest) -> Fabric:
    fabric = request.fabric
    margin = fabric.selvedgeMarginMm
    return Fabric(
        width_mm=float(fabric.fabricWidthMm),
        layout=Layout(fabric.layout or "folded"),
        direction=Direction(fabric.direction or "two-way"),
        selvedge_margin_mm=float(DEFAULT_SELVEDGE_MARGIN_MM if margin is None else margin),
    )


def to_settings(request: CuttingPlanRequest) -> FinishingSettings:
    finishing = request.finishing
    return FinishingSettings(
        to_policy(finishing), to_notch_requests(finishing), wants_auto_notches(finishing)
    )


def to_spacing_mm(request: CuttingPlanRequest) -> float:
    spacing = request.spacingMm
    return float(DEFAULT_SPACING_MM if spacing is None else spacing)


def _placement(placed: PlacedPiece) -> dict[str, Any]:
    return {
        "garmentLabel": placed.garment_label,
        "panelId": placed.panel_id,
        "copy": placed.copy,
        "plies": placed.plies,
        "rotationDeg": placed.rotation_deg,
        "mirrored": placed.mirrored,
        "onFold": placed.on_fold,
        "outline": [[x, y] for x, y in placed.outline],
    }


def to_cutting_plan(
    request: CuttingPlanRequest, fabric: Fabric, plan: CuttingPlan
) -> out.CuttingPlan:
    return out.CuttingPlan.model_validate(
        {
            "unit": "mm",
            "engine": {"name": ENGINE_NAME, "version": ENGINE_VERSION},
            "fabricWidthMm": request.fabric.fabricWidthMm,
            "usableWidthMm": plan.usable_width_mm,
            "layout": fabric.layout.value,
            "direction": fabric.direction.value,
            "fabricLengthMm": plan.fabric_length_mm,
            "efficiency": plan.efficiency,
            "pieceCount": plan.piece_count,
            "surplusPieceCount": plan.surplus_piece_count,
            "placements": [_placement(p) for p in plan.placements],
        }
    )

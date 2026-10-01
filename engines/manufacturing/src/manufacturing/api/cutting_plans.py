"""POST /v1/cutting-plans : valider, appeler le cœur, rendre le contrat."""

from typing import Any

from fastapi import APIRouter

from atelier_contracts.generated.manufacturing.cutting_plan_request_schema import (
    CuttingPlanRequest,
)
from atelier_engine_kit import EngineError
from manufacturing.core.cutting_plan import compute_cutting_plan
from manufacturing.core.errors import ManufacturingError
from manufacturing.spec.cutting_plans import (
    to_cutting_plan,
    to_fabric,
    to_garments,
    to_settings,
    to_spacing_mm,
)

router = APIRouter()


@router.post("/v1/cutting-plans")
def create_cutting_plan(request: CuttingPlanRequest) -> dict[str, Any]:
    fabric = to_fabric(request)
    try:
        plan = compute_cutting_plan(
            to_garments(request), fabric, to_settings(request), to_spacing_mm(request)
        )
    except ManufacturingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    result = to_cutting_plan(request, fabric, plan)
    return result.model_dump(by_alias=True, exclude_none=True, mode="json")

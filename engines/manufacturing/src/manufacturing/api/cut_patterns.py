"""POST /v1/cut-patterns : valider, appeler le cœur, rendre le contrat."""

from typing import Any

from fastapi import APIRouter

from atelier_contracts.generated.manufacturing.cut_pattern_request_schema import (
    CutPatternRequest,
)
from atelier_engine_kit import EngineError
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.spec.cut_patterns import (
    to_cut_pattern,
    to_notch_requests,
    to_pattern,
    to_policy,
    wants_auto_notches,
)

router = APIRouter()


@router.post("/v1/cut-patterns")
def create_cut_pattern(request: CutPatternRequest) -> dict[str, Any]:
    pattern = to_pattern(request.spec)
    try:
        pieces = compute_cut_pieces(
            pattern,
            to_policy(request.finishing),
            to_notch_requests(request.finishing),
            wants_auto_notches(request.finishing),
        )
    except ManufacturingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    result = to_cut_pattern(request, pattern, pieces)
    return result.model_dump(by_alias=True, exclude_none=True, mode="json")

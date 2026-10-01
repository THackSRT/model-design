"""POST /v1/graded-patterns : valider, grader, rendre le contrat."""

from typing import Any

from fastapi import APIRouter

from atelier_contracts.generated.manufacturing.graded_pattern_request_schema import (
    GradedPatternRequest,
)
from atelier_engine_kit import EngineError
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.grading import grade_patterns
from manufacturing.spec.grading import (
    to_alignment,
    to_response,
    to_settings,
    to_sized_patterns,
)

router = APIRouter()


@router.post("/v1/graded-patterns")
def create_graded_pattern(request: GradedPatternRequest) -> dict[str, Any]:
    try:
        result = grade_patterns(
            to_sized_patterns(request),
            request.baseSize.root,
            to_alignment(request),
            to_settings(request),
        )
    except ManufacturingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    return to_response(request, result)

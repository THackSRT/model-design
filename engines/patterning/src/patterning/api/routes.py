"""Points d'entrée HTTP : valident l'entrée, appellent le cœur, rendent le contrat."""

from typing import Any

from fastapi import APIRouter

from atelier_contracts.generated.designs.create_design_version_request_schema import (
    CreateDesignVersionRequest as DraftPatternRequest,
)
from atelier_engine_kit import EngineError
from patterning.core.straight_skirt import DraftingError, draft_straight_skirt
from patterning.spec.convert import to_skirt_inputs, to_spec

router = APIRouter()


@router.post("/v1/patterns")
def draft_pattern(request: DraftPatternRequest) -> dict[str, Any]:
    try:
        pattern = draft_straight_skirt(to_skirt_inputs(request.measurements, request.garment))
    except DraftingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    return to_spec(pattern).model_dump(by_alias=True, exclude_none=True, mode="json")

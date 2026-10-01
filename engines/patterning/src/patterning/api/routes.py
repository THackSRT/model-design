"""Points d'entrée HTTP : valident l'entrée, appellent le cœur, rendent le contrat."""

from typing import Any

from fastapi import APIRouter

from atelier_contracts.generated.designs.create_design_version_request_schema import (
    CreateDesignVersionRequest as DraftPatternRequest,
)
from atelier_engine_kit import EngineError
from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from patterning.spec.convert import to_spec
from patterning.spec.request import to_draft_inputs

router = APIRouter()


@router.post("/v1/patterns")
def draft_pattern(request: DraftPatternRequest) -> dict[str, Any]:
    try:
        inputs = to_draft_inputs(request.measurements, request.garment)
        pattern = draft(inputs.garment_type, inputs.measurements, inputs.params)
    except DraftingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    return to_spec(pattern).model_dump(by_alias=True, exclude_none=True, mode="json")

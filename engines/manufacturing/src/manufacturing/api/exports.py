"""POST /v1/exports : valider, finir les pièces, écrire le fichier demandé."""

from fastapi import APIRouter, Response

from atelier_contracts.generated.manufacturing.export_request_schema import ExportRequest
from atelier_engine_kit import EngineError
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.export import exporter_for
from manufacturing.spec.cut_patterns import (
    to_notch_requests,
    to_pattern,
    to_policy,
    wants_auto_notches,
)
from manufacturing.spec.exports import CONTENT_TYPES, content_disposition, to_job

router = APIRouter()


@router.post("/v1/exports")
def create_export(request: ExportRequest) -> Response:
    export_format = request.format.value
    pattern = to_pattern(request.spec)
    try:
        exporter = exporter_for(export_format)
        pieces = compute_cut_pieces(
            pattern,
            to_policy(request.finishing),
            to_notch_requests(request.finishing),
            wants_auto_notches(request.finishing),
        )
        job = to_job(request, pattern, pieces)
        content = exporter(job)
    except ManufacturingError as error:
        raise EngineError(kind=error.kind, detail=error.detail) from error
    headers = {"Content-Disposition": content_disposition(job, export_format)}
    return Response(content=content, media_type=CONTENT_TYPES[export_format], headers=headers)

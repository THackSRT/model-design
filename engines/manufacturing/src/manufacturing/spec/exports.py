"""Conversions pour les exports : requête du contrat, tâche d'export, nom de fichier, type MIME."""

import re

from atelier_contracts.generated.manufacturing.export_request_schema import ExportRequest
from manufacturing.core.model import CutPiece, Pattern
from manufacturing.export.sheet import ExportJob

CONTENT_TYPES = {
    "svg": "image/svg+xml",
    "pdf-a4-tiled": "application/pdf",
    "dxf-aama": "image/vnd.dxf",
}
EXTENSIONS = {"svg": "svg", "pdf-a4-tiled": "pdf", "dxf-aama": "dxf"}


def _clean(value: str) -> str:
    return re.sub(r"[^a-z0-9-]", "-", value.lower())


def to_job(request: ExportRequest, pattern: Pattern, pieces: tuple[CutPiece, ...]) -> ExportJob:
    return ExportJob(
        garment_type=pattern.garment_type,
        pieces=pieces,
        size_label=request.sizeLabel.root if request.sizeLabel else None,
        reference=request.reference.root if request.reference else None,
        locale=str(getattr(request.locale, "value", request.locale) or "fr"),
    )


def filename(job: ExportJob, export_format: str) -> str:
    stem = _clean(job.garment_type)
    if job.size_label:
        stem += "-" + _clean(job.size_label)
    return f"{stem}.{EXTENSIONS[export_format]}"


def content_disposition(job: ExportJob, export_format: str) -> str:
    return f'attachment; filename="{filename(job, export_format)}"'

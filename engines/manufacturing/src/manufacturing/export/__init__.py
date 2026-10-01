"""Exports : un exporteur par format, tous purs (ils rendent des `bytes`)."""

from collections.abc import Callable

from manufacturing.core.errors import ManufacturingError
from manufacturing.export.sheet import ExportJob
from manufacturing.export.svg import render_svg

EXPORT_FORMAT_UNAVAILABLE = "export-format-unavailable"

# pdf-a4-tiled (1.18b) et dxf-aama (1.18c) s'ajoutent ici.
EXPORTERS: dict[str, Callable[[ExportJob], bytes]] = {"svg": render_svg}


def exporter_for(export_format: str) -> Callable[[ExportJob], bytes]:
    try:
        return EXPORTERS[export_format]
    except KeyError:
        raise ManufacturingError(
            EXPORT_FORMAT_UNAVAILABLE, f"format pas encore disponible : {export_format}"
        ) from None

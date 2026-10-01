"""POST /v1/exports au format `pdf-a4-tiled` : route, en-têtes, déterminisme, référence golden.

La référence `tests/golden/straight-skirt.pdf` ne se met à jour (UPDATE_GOLDEN=1) qu'avec
l'accord d'un modéliste.
"""

import io
import os
from pathlib import Path

from fastapi.testclient import TestClient
from pypdf import PdfReader

from manufacturing.main import create_app
from tests.builders import skirt_spec

client = TestClient(create_app())
REFERENCE = Path(__file__).parent.parent / "golden" / "straight-skirt.pdf"


def _body() -> dict[str, object]:
    return {
        "format": "pdf-a4-tiled",
        "spec": skirt_spec(),
        "sizeLabel": "38",
        "reference": "MOD-002",
    }


def test_pdf_export_is_returned_with_file_headers() -> None:
    response = client.post("/v1/exports", json=_body())
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="straight-skirt-38.pdf"'
    assert len(PdfReader(io.BytesIO(response.content)).pages) >= 2


def test_two_identical_calls_give_the_same_bytes() -> None:
    first = client.post("/v1/exports", json=_body())
    assert first.content == client.post("/v1/exports", json=_body()).content


def test_reference_straight_skirt_pdf_is_unchanged() -> None:
    response = client.post("/v1/exports", json=_body())
    assert response.status_code == 200
    if os.environ.get("UPDATE_GOLDEN") == "1":
        REFERENCE.write_bytes(response.content)
    assert response.content == REFERENCE.read_bytes()

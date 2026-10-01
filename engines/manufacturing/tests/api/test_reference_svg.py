"""Référence SVG (`tests/golden/straight-skirt.svg`) : toute différence fait échouer le test.

Mettre à jour la référence (UPDATE_GOLDEN=1) demande l'accord d'un modéliste. Fichier écrit en LF.
"""

import os
from pathlib import Path

from fastapi.testclient import TestClient

from manufacturing.main import create_app
from tests.builders import skirt_spec

REFERENCE = Path(__file__).parent.parent / "golden" / "straight-skirt.svg"


def test_reference_straight_skirt_svg_is_unchanged() -> None:
    body = {"format": "svg", "spec": skirt_spec(), "sizeLabel": "38", "reference": "MOD-002"}
    response = TestClient(create_app()).post("/v1/exports", json=body)
    assert response.status_code == 200
    if os.environ.get("UPDATE_GOLDEN") == "1":
        with REFERENCE.open("w", encoding="utf-8", newline="\n") as handle:
            handle.write(response.text)
    assert response.content == REFERENCE.read_bytes()

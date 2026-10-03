"""Tests de référence : toute différence de sortie fait échouer le test.

Mettre à jour une référence (UPDATE_GOLDEN=1) demande l'accord d'un modéliste.
"""

import json
import os
from pathlib import Path

from fastapi.testclient import TestClient

from manufacturing.main import create_app
from tests.builders import skirt_spec
from tests.golden_files import read_text_exact, write_text_lf

REFERENCE = Path(__file__).parent / "straight-skirt-cut-pattern.json"


def test_reference_straight_skirt_cut_pattern_is_unchanged() -> None:
    response = TestClient(create_app()).post("/v1/cut-patterns", json={"spec": skirt_spec()})
    assert response.status_code == 200
    produced = json.dumps(response.json(), indent=2)
    if os.environ.get("UPDATE_GOLDEN") == "1":
        write_text_lf(REFERENCE, produced + "\n")
    assert produced + "\n" == read_text_exact(REFERENCE)

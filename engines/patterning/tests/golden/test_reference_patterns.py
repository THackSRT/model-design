"""Tests de référence : toute différence de sortie fait échouer le test.

Mettre à jour une référence (UPDATE_GOLDEN=1) demande l'accord d'un modéliste.
"""

import json
import os
from pathlib import Path

from patterning.core.straight_skirt import draft_straight_skirt
from patterning.spec.convert import to_spec
from tests.builders import REFERENCE_SKIRT

REFERENCE = Path(__file__).parent / "straight-skirt-reference.json"


def test_reference_straight_skirt_is_unchanged() -> None:
    spec = to_spec(draft_straight_skirt(REFERENCE_SKIRT))
    produced = json.dumps(spec.model_dump(by_alias=True, exclude_none=True, mode="json"), indent=2)
    if os.environ.get("UPDATE_GOLDEN") == "1":
        REFERENCE.write_text(produced + "\n", encoding="utf-8")
    assert produced + "\n" == REFERENCE.read_text(encoding="utf-8")

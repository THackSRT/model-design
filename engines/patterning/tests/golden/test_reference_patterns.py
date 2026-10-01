"""Tests de référence : toute différence de sortie fait échouer le test.

Une référence naît `candidate` et passe `validated` après la toile du modéliste (travail 1.25).
Mettre à jour une référence (UPDATE_GOLDEN=1) demande l'accord de l'orchestrateur et d'un modéliste.
"""

import json
import os
import time
from pathlib import Path
from typing import Any

import pytest

from patterning import ENGINE_VERSION
from patterning.core.drafting import DRAFTERS, draft
from patterning.spec.convert import to_spec
from tests.builders import REFERENCE_PARAMS, reference_measurements

GOLDEN = Path(__file__).parent
MANIFEST: list[dict[str, Any]] = json.loads((GOLDEN / "references.json").read_text("utf-8"))
BUDGET_S = 1.0  # le tracé vise moins de 100 ms ; le test n'échoue qu'au-delà d'une seconde


def _produce(garment_type: str) -> str:
    pattern = draft(garment_type, reference_measurements(), REFERENCE_PARAMS[garment_type])
    spec = to_spec(pattern)
    return json.dumps(spec.model_dump(by_alias=True, exclude_none=True, mode="json"), indent=2)


@pytest.mark.parametrize("entry", MANIFEST, ids=lambda e: e["garmentType"])
def test_reference_pattern_is_unchanged(entry: dict[str, Any]) -> None:
    produced = _produce(entry["garmentType"]) + "\n"
    path = GOLDEN / entry["file"]
    if os.environ.get("UPDATE_GOLDEN") == "1":
        path.write_text(produced, encoding="utf-8", newline="\n")
    assert produced == path.read_text(encoding="utf-8")


@pytest.mark.parametrize("entry", MANIFEST, ids=lambda e: e["garmentType"])
def test_reference_is_drafted_within_the_time_budget(entry: dict[str, Any]) -> None:
    started = time.perf_counter()
    _produce(entry["garmentType"])
    assert time.perf_counter() - started < BUDGET_S


def test_manifest_declares_one_reference_per_drafted_type() -> None:
    assert sorted(e["garmentType"] for e in MANIFEST) == sorted(DRAFTERS)


@pytest.mark.parametrize("entry", MANIFEST, ids=lambda e: e["garmentType"])
def test_manifest_entry_is_complete(entry: dict[str, Any]) -> None:
    assert entry["engineVersion"] == ENGINE_VERSION
    assert entry["status"] in {"candidate", "validated"}
    assert (entry["status"] == "validated") == (entry["validatedOn"] is not None)
    assert entry["note"]
    assert (GOLDEN / entry["file"]).is_file()

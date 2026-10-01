"""La jupe à pinces du moteur de patronage traverse toutes les routes du moteur."""

from typing import Any

from fastapi.testclient import TestClient

from atelier_contracts.generated.manufacturing.cut_pattern_schema import CutPattern
from manufacturing.main import create_app
from tests.darted import darted_skirt_spec

client = TestClient(create_app())


def _post(route: str, body: dict[str, Any]) -> Any:
    return client.post(route, json=body)


def test_cut_patterns_accepts_the_darted_skirt() -> None:
    response = _post("/v1/cut-patterns", {"spec": darted_skirt_spec()})
    assert response.status_code == 200
    body = response.json()
    CutPattern.model_validate(body)
    assert [p["panelId"] for p in body["pieces"]] == ["front", "back-right", "back-left"]
    front = body["pieces"][0]
    ids = [e["edgeId"] for e in front["seamLine"]]
    assert "dart-1-right" in ids
    assert "dart-1-left" in ids
    legs = [e for e in front["seamLine"] if e["edgeId"].startswith("dart")]
    assert all(e["allowanceMm"] == 0 for e in legs)
    assert "auto" in {n["source"] for n in front["notches"]}


def test_explicit_allowance_on_a_dart_leg_is_a_problem() -> None:
    entry = {"panelId": "front", "edgeId": "dart-1-right", "allowanceMm": 10}
    finishing = {"seamAllowances": {"byEdge": [entry]}}
    response = _post("/v1/cut-patterns", {"spec": darted_skirt_spec(), "finishing": finishing})
    assert response.status_code == 422
    assert response.json()["type"] == "/problems/allowance-on-dart"


def test_exports_svg_accepts_the_darted_skirt() -> None:
    response = _post("/v1/exports", {"format": "svg", "spec": darted_skirt_spec()})
    assert response.status_code == 200


def test_cutting_plans_accepts_the_darted_skirt() -> None:
    body = {
        "garments": [{"label": "38", "spec": darted_skirt_spec(), "count": 1}],
        "fabric": {"fabricWidthMm": 1400},
    }
    assert _post("/v1/cutting-plans", body).status_code == 200


def test_graded_patterns_accepts_the_darted_skirt_in_two_sizes() -> None:
    sizes = [{"size": s, "spec": darted_skirt_spec()} for s in ("38", "40")]
    response = _post("/v1/graded-patterns", {"baseSize": "38", "sizes": sizes})
    assert response.status_code == 200

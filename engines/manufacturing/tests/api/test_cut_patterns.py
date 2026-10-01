"""POST /v1/cut-patterns : réponses conformes au contrat et erreurs RFC 9457."""

from typing import Any

import pytest
from fastapi.testclient import TestClient

from atelier_contracts.generated.manufacturing.cut_pattern_schema import CutPattern
from manufacturing import ENGINE_VERSION
from manufacturing.main import create_app
from tests.builders import skirt_spec

client = TestClient(create_app())


def _post(body: dict[str, Any]) -> Any:
    return client.post("/v1/cut-patterns", json=body)


def test_returns_a_valid_cut_pattern() -> None:
    response = _post({"spec": skirt_spec(), "sizeLabel": "38"})
    assert response.status_code == 200
    body = response.json()
    CutPattern.model_validate(body)
    assert body["engine"] == {"name": "manufacturing", "version": ENGINE_VERSION}
    assert body["specEngine"] == {"name": "patterning", "version": "0.1.0"}
    assert body["garment"] == {"type": "straight-skirt"}
    assert body["sizeLabel"] == "38"
    assert [p["panelId"] for p in body["pieces"]] == ["front", "back"]
    assert "foldLine" in body["pieces"][0]


def test_size_label_is_absent_when_not_given() -> None:
    assert "sizeLabel" not in _post({"spec": skirt_spec()}).json()


def test_spec_notches_ease_and_estimated_measurements_do_not_break_anything() -> None:
    spec = skirt_spec()
    spec["estimatedMeasurements"] = ["bustGirthMm"]
    spec["seams"][0]["easeMm"] = 5
    spec["panels"][0]["notches"] = [{"edgeId": "hem", "distanceMm": 100, "count": 2}]
    response = _post({"spec": spec, "finishing": {"autoNotches": "none"}})
    assert response.status_code == 200
    notch = response.json()["pieces"][0]["notches"][0]
    assert (notch["edgeId"], notch["count"], notch["source"]) == ("hem", 2, "requested")


def test_finishing_options_change_the_cut_line() -> None:
    finishing = {
        "seamAllowances": {"defaultMm": 15, "byRole": {"hem": 40}},
        "notches": [{"panelId": "back", "edgeId": "hem", "distanceMm": 10}],
        "autoNotches": "none",
    }
    body = _post({"spec": skirt_spec(), "finishing": finishing}).json()
    back = body["pieces"][1]
    assert [n["source"] for n in back["notches"]] == ["requested"]
    assert body["pieces"][0]["notches"] == []
    assert back["bounds"]["min"][1] == -40


def _error(body: dict[str, Any], kind: str) -> None:
    response = _post(body)
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["type"] == f"/problems/{kind}"


def _by_edge(edge_id: str) -> dict[str, Any]:
    entry = {"panelId": "front", "edgeId": edge_id, "allowanceMm": 5}
    return {"seamAllowances": {"byEdge": [entry]}}


def test_open_contour() -> None:
    spec = skirt_spec()
    spec["panels"][0]["edges"][0]["to"] = [240.0, 0.0]
    _error({"spec": spec}, "open-contour")


def test_unknown_edge() -> None:
    _error({"spec": skirt_spec(), "finishing": _by_edge("x")}, "unknown-edge")


def test_allowance_on_fold() -> None:
    _error({"spec": skirt_spec(), "finishing": _by_edge("fold")}, "allowance-on-fold")


def test_notch_outside_edge() -> None:
    finishing = {"notches": [{"panelId": "front", "edgeId": "hem", "distanceMm": 9000}]}
    _error({"spec": skirt_spec(), "finishing": finishing}, "notch-outside-edge")


def test_fold_edge_missing() -> None:
    spec = skirt_spec()
    for edge in spec["panels"][0]["edges"]:
        if edge.get("role") == "fold":
            edge["role"] = "seam"
    _error({"spec": spec}, "fold-edge-missing")


def test_cut_line_self_intersects() -> None:
    spec = skirt_spec()
    panel = spec["panels"][0]
    points = [(0, 0), (100, 0), (100, 100), (52, 100), (52, 50), (48, 50), (48, 100), (0, 100)]
    panel["edges"] = [
        {"id": f"e{i}", "from": list(p), "to": list(points[(i + 1) % len(points)])}
        for i, p in enumerate(points)
    ]
    panel["cutOnFold"] = False
    panel.pop("notches", None)
    spec["panels"] = [panel]
    spec["seams"] = []
    finishing = {"seamAllowances": {"defaultMm": 10}}
    _error({"spec": spec, "finishing": finishing}, "cut-line-self-intersects")


@pytest.mark.parametrize(
    "body",
    [{}, {"spec": {}}, {"spec": "x"}, {"spec": skirt_spec(), "sizeLabel": "<script>"}],
)
def test_request_outside_the_schema_is_rejected(body: dict[str, Any]) -> None:
    assert _post(body).status_code == 422

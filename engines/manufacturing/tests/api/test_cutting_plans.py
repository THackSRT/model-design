"""POST /v1/cutting-plans : réponses conformes au contrat et erreurs RFC 9457."""

import copy
import math
from typing import Any

from fastapi.testclient import TestClient

from atelier_contracts.generated.manufacturing.cutting_plan_schema import CuttingPlan
from manufacturing import ENGINE_VERSION
from manufacturing.main import create_app
from tests.builders import skirt_spec

client = TestClient(create_app())


def _request(fabric: dict[str, Any] | None = None, **extra: Any) -> dict[str, Any]:
    body: dict[str, Any] = {
        "garments": [{"label": "38", "spec": skirt_spec()}],
        "fabric": fabric or {"fabricWidthMm": 1400},
    }
    return body | extra


def _post(body: dict[str, Any]) -> Any:
    return client.post("/v1/cutting-plans", json=body)


def _piece_lengths() -> list[float]:
    """Étendue des pièces le long du droit fil (vertical), lue sur /v1/cut-patterns."""
    pieces = client.post("/v1/cut-patterns", json={"spec": skirt_spec()}).json()["pieces"]
    return [p["bounds"]["max"][1] - p["bounds"]["min"][1] for p in pieces]


def test_skirt_on_folded_fabric_is_a_valid_plan() -> None:
    response = _post(_request())
    assert response.status_code == 200
    body = response.json()
    CuttingPlan.model_validate(body)
    assert body["engine"] == {"name": "manufacturing", "version": ENGINE_VERSION}
    assert (body["layout"], body["direction"], body["usableWidthMm"]) == ("folded", "two-way", 690)
    assert sorted(p["panelId"] for p in body["placements"]) == ["back", "front"]
    assert all(p["onFold"] and p["plies"] == 1 for p in body["placements"])
    assert all(p["garmentLabel"] == "38" for p in body["placements"])


def test_length_is_the_two_pieces_plus_the_spacing() -> None:
    lengths = _piece_lengths()
    for spacing in (0, 5, 20):
        body = _post(_request(spacingMm=spacing)).json()
        assert body["fabricLengthMm"] == math.ceil(sum(lengths) + spacing)
    assert 0 < body["efficiency"] <= 1


def test_flat_fabric_unfolds_the_pieces() -> None:
    body = _post(_request({"fabricWidthMm": 1400, "layout": "single"})).json()
    CuttingPlan.model_validate(body)
    assert body["usableWidthMm"] == 1380
    assert not any(p["onFold"] for p in body["placements"])
    assert body["efficiency"] > _post(_request()).json()["efficiency"]


def test_count_and_several_garments() -> None:
    body = _request()
    body["garments"] = [
        {"label": "38", "spec": skirt_spec(), "count": 2},
        {"label": "40", "spec": copy.deepcopy(skirt_spec())},
    ]
    plan = _post(body).json()
    CuttingPlan.model_validate(plan)
    labels = [p["garmentLabel"] for p in plan["placements"]]
    assert (labels.count("38"), labels.count("40")) == (4, 2)


def test_same_request_gives_the_same_json() -> None:
    assert _post(_request()).text == _post(_request()).text


def test_finishing_options_are_applied() -> None:
    thin = _post(_request(finishing={"seamAllowances": {"defaultMm": 5}})).json()
    wide = _post(_request(finishing={"seamAllowances": {"defaultMm": 30}})).json()
    assert thin["fabricLengthMm"] < wide["fabricLengthMm"]


def _problem(response: Any, kind: str) -> None:
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["type"].endswith(kind)


def test_fold_not_on_grain_is_a_problem() -> None:
    body = _request()
    body["garments"][0]["spec"]["panels"][0]["grainline"] = [[0, 100], [200, 100]]
    _problem(_post(body), "fold-not-on-grain")


def test_piece_wider_than_fabric_is_a_problem() -> None:
    _problem(_post(_request({"fabricWidthMm": 300})), "piece-wider-than-fabric")


def test_too_many_pieces_is_a_problem() -> None:
    body = _request({"fabricWidthMm": 3200, "layout": "single"})
    body["garments"][0]["count"] = 50
    body["garments"][0]["spec"]["panels"][0]["quantity"] = 20
    _problem(_post(body), "too-many-pieces")


def test_invalid_request_is_rejected() -> None:
    assert _post({"garments": [], "fabric": {"fabricWidthMm": 1400}}).status_code == 422

"""POST /v1/graded-patterns : réponses conformes au contrat et erreurs RFC 9457."""

from typing import Any

from fastapi.testclient import TestClient

from atelier_contracts.generated.manufacturing.graded_pattern_schema import GradedPattern
from manufacturing import ENGINE_VERSION
from manufacturing.main import create_app
from tests.builders import skirt_spec, spec_with_x_scaled

client = TestClient(create_app())


def _body(**extra: Any) -> dict[str, Any]:
    sizes = [
        {"size": "38", "spec": skirt_spec()},
        {"size": "40", "spec": spec_with_x_scaled(skirt_spec(), 1.05)},
    ]
    return {"baseSize": "38", "sizes": sizes, **extra}


def test_returns_a_valid_graded_pattern() -> None:
    response = client.post("/v1/graded-patterns", json=_body())
    assert response.status_code == 200
    body = response.json()
    GradedPattern.model_validate(body)
    assert body["engine"] == {"name": "manufacturing", "version": ENGINE_VERSION}
    assert [s["size"] for s in body["sizes"]] == ["38", "40"]
    vertex = body["gradeRules"][0]["vertices"][1]
    assert vertex["edgeId"] == "side-lower"
    assert vertex["deltas"] == [
        {"size": "38", "dxMm": 0, "dyMm": 0},
        {"size": "40", "dxMm": 12.5, "dyMm": 0},
    ]


def test_grainline_alignment_and_finishing_are_accepted() -> None:
    body = _body(alignment="grainline", finishing={"autoNotches": "none"})
    response = client.post("/v1/graded-patterns", json=body)
    assert response.status_code == 200
    grains = [s["pieces"][0]["grainline"][0] for s in response.json()["sizes"]]
    assert grains[0] == grains[1]


def test_unknown_base_size_is_a_problem() -> None:
    response = client.post("/v1/graded-patterns", json={**_body(), "baseSize": "44"})
    assert response.status_code == 422
    assert response.headers["content-type"].startswith("application/problem+json")
    assert response.json()["type"].endswith("/problems/sizes-mismatch")


def test_different_panels_are_a_problem() -> None:
    body = _body()
    body["sizes"][1]["spec"]["panels"].pop()
    body["sizes"][1]["spec"]["seams"] = []
    response = client.post("/v1/graded-patterns", json=body)
    assert response.status_code == 422
    assert response.json()["type"].endswith("/problems/sizes-mismatch")

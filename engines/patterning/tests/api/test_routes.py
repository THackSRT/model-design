from fastapi.testclient import TestClient

from patterning.main import create_app
from tests.builders import reference_request

client = TestClient(create_app())


def test_drafts_a_pattern_that_follows_the_contract() -> None:
    response = client.post("/v1/patterns", json=reference_request())
    assert response.status_code == 200
    body = response.json()
    assert body["unit"] == "mm"
    assert body["engine"]["name"] == "patterning"
    assert [p["id"] for p in body["panels"]] == ["front", "back"]


def test_impossible_pattern_is_a_problem_response() -> None:
    request = reference_request()
    request["measurements"] = {**request["measurements"], "statureMm": 2200}  # type: ignore[dict-item]
    request["garment"] = {"type": "straight-skirt", "params": {"lengthMm": 300}}
    response = client.post("/v1/patterns", json=request)
    assert response.status_code == 422
    assert response.json()["type"] == "/problems/skirt-shorter-than-hip-depth"


def test_rejects_measurements_outside_plausible_bounds() -> None:
    request = reference_request()
    request["measurements"] = {**request["measurements"], "waistGirthMm": 10}  # type: ignore[dict-item]
    assert client.post("/v1/patterns", json=request).status_code == 422

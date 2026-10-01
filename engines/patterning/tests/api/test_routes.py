import pytest
from fastapi.testclient import TestClient

from patterning.main import create_app
from tests.builders import reference_request

client = TestClient(create_app())


def _request(garment: dict[str, object]) -> dict[str, object]:
    return {**reference_request(), "garment": garment}


def test_drafts_a_straight_skirt_that_follows_the_contract() -> None:
    response = client.post("/v1/patterns", json=reference_request())
    assert response.status_code == 200
    body = response.json()
    assert body["unit"] == "mm"
    assert body["engine"] == {"name": "patterning", "version": "0.5.0"}
    assert [p["id"] for p in body["panels"]] == ["front", "back-right", "back-left"]
    assert all(p["notches"] for p in body["panels"])


def test_straight_skirt_lists_its_estimated_measurements_and_no_ease() -> None:
    body = client.post("/v1/patterns", json=reference_request()).json()
    assert body["estimatedMeasurements"] == [
        "bustGirthMm",
        "bustPointWidthMm",
        "hipHeightMm",
        "waistHeightMm",
    ]
    assert all("easeMm" not in seam for seam in body["seams"])


def test_drafts_a_circle_skirt_with_a_waistband() -> None:
    garment = {"type": "circle-skirt", "params": {"lengthMm": 650, "waistbandWidthMm": 40}}
    response = client.post("/v1/patterns", json=_request(garment))
    assert response.status_code == 200
    body = response.json()
    assert [p["id"] for p in body["panels"]] == [
        "front",
        "back",
        "waistband-front",
        "waistband-back",
    ]
    assert "estimatedMeasurements" not in body


def test_drafts_a_circle_skirt_without_a_waistband() -> None:
    garment = {"type": "circle-skirt", "params": {"lengthMm": 650, "waistbandWidthMm": 0}}
    response = client.post("/v1/patterns", json=_request(garment))
    assert response.status_code == 200
    assert [p["id"] for p in response.json()["panels"]] == ["front", "back"]


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


def _trousers_request(**measurements: object) -> dict[str, object]:
    base = reference_request()
    garment = {"type": "trousers", "params": {"lengthMm": 1000, "hemGirthMm": 440}}
    return {
        "measurements": {**base["measurements"], **measurements},  # type: ignore[dict-item]
        "garment": garment,
    }


def test_drafts_trousers_with_four_panels_and_estimated_thigh() -> None:
    response = client.post("/v1/patterns", json=_trousers_request(crotchHeightMm=770))
    assert response.status_code == 200
    body = response.json()
    assert [p["id"] for p in body["panels"]] == [
        "front-left",
        "front-right",
        "back-left",
        "back-right",
    ]
    assert "thighGirthMm" in body["estimatedMeasurements"]
    assert "crotchHeightMm" not in body["estimatedMeasurements"]


def test_trousers_without_crotch_height_is_a_problem_response() -> None:
    response = client.post("/v1/patterns", json=_trousers_request())
    assert response.status_code == 422
    problem = response.json()
    assert problem["type"] == "/problems/measurement-required"
    assert "crotchHeightMm" in problem["detail"]


def _bodice_request(params: dict[str, object]) -> dict[str, object]:
    base = reference_request()["measurements"]
    return {
        "measurements": {**base, "bustGirthMm": 900, "backWaistLengthMm": 380},  # type: ignore[dict-item]
        "garment": {"type": "bodice", "params": params},
    }


def test_drafts_a_sleeveless_bodice_and_one_with_sleeves() -> None:
    plain = client.post("/v1/patterns", json=_bodice_request({}))
    assert plain.status_code == 200
    assert [p["id"] for p in plain.json()["panels"]] == ["front", "back-right", "back-left"]
    sleeved = client.post("/v1/patterns", json=_bodice_request({"sleeve": {"lengthMm": 600}}))
    assert sleeved.status_code == 200
    body = sleeved.json()
    assert [p["id"] for p in body["panels"]][-1] == "sleeve"
    assert body["panels"][-1]["quantity"] == 2
    assert "wristGirthMm" in body["estimatedMeasurements"]
    eases = {s["id"]: s["easeMm"] for s in body["seams"] if "easeMm" in s}
    assert eases["armhole-back-left"] == eases["armhole-back-right"]
    assert eases["armhole-front"] + eases["armhole-back-right"] == pytest.approx(15, abs=0.01)


@pytest.mark.parametrize("missing", ["bustGirthMm", "backWaistLengthMm"])
def test_bodice_without_an_essential_measurement_is_a_problem_response(missing: str) -> None:
    request = _bodice_request({})
    del request["measurements"][missing]  # type: ignore[index]
    response = client.post("/v1/patterns", json=request)
    assert response.status_code == 422
    problem = response.json()
    assert problem["type"] == "/problems/measurement-required"
    assert missing in problem["detail"]


def test_bodice_with_a_neckline_below_the_bust_is_a_problem_response() -> None:
    response = client.post("/v1/patterns", json=_bodice_request({"frontNeckDepthMm": 250}))
    assert response.status_code == 422
    assert response.json()["type"] == "/problems/neckline-too-deep"

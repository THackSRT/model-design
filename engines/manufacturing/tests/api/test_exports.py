"""POST /v1/exports : SVG 1:1, en-têtes, formats pas encore livrés, erreurs."""

import xml.etree.ElementTree as ET
from typing import Any

from fastapi.testclient import TestClient

from manufacturing.main import create_app
from tests.builders import skirt_spec

client = TestClient(create_app())


def _post(body: dict[str, Any]) -> Any:
    return client.post("/v1/exports", json=body)


def test_svg_export_is_returned_with_file_headers() -> None:
    response = _post({"format": "svg", "spec": skirt_spec(), "sizeLabel": "38"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/svg+xml")
    assert response.headers["content-disposition"] == 'attachment; filename="straight-skirt-38.svg"'
    root = ET.fromstring(response.content)
    assert root.attrib["viewBox"].split()[2] == root.attrib["width"].removesuffix("mm")


def test_file_name_is_cleaned() -> None:
    response = _post({"format": "svg", "spec": skirt_spec(), "sizeLabel": "Petit/Plus 2"})
    assert response.headers["content-disposition"] == (
        'attachment; filename="straight-skirt-petit-plus-2.svg"'
    )


def test_file_name_without_size() -> None:
    response = _post({"format": "svg", "spec": skirt_spec()})
    assert response.headers["content-disposition"] == 'attachment; filename="straight-skirt.svg"'


def test_two_identical_calls_give_the_same_bytes() -> None:
    body = {"format": "svg", "spec": skirt_spec(), "reference": "MOD-002"}
    assert _post(body).content == _post(body).content


def test_finishing_errors_are_422() -> None:
    finishing = {"notches": [{"panelId": "front", "edgeId": "nope", "distanceMm": 10}]}
    response = _post({"format": "svg", "spec": skirt_spec(), "finishing": finishing})
    assert response.status_code == 422
    assert response.json()["type"] == "/problems/unknown-edge"


def test_locale_absent_or_explicit_gives_the_same_file() -> None:
    absent = _post({"format": "svg", "spec": skirt_spec()})
    explicit = _post({"format": "svg", "spec": skirt_spec(), "locale": "fr"})
    assert absent.status_code == explicit.status_code == 200
    assert absent.content == explicit.content


def test_unknown_format_is_rejected_by_the_schema() -> None:
    assert _post({"format": "png", "spec": skirt_spec()}).status_code == 422

"""POST /v1/exports en DXF-AAMA : en-têtes, cohérence avec /v1/cut-patterns, pinces."""

from typing import Any

from fastapi.testclient import TestClient

from manufacturing.main import create_app
from tests.builders import skirt_spec
from tests.darted import darted_skirt_spec
from tests.dxf_reader import Entity, blocks, header

client = TestClient(create_app())


def _dxf(spec: dict[str, Any], **extra: Any) -> Any:
    return client.post("/v1/exports", json={"format": "dxf-aama", "spec": spec, **extra})


def _count(entities: list[Entity], kind: str, layer: str) -> int:
    return sum(1 for e in entities if e.kind == kind and e.layer == layer)


def test_dxf_is_returned_with_file_headers() -> None:
    response = _dxf(skirt_spec(), sizeLabel="38")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("image/vnd.dxf")
    assert response.headers["content-disposition"] == 'attachment; filename="straight-skirt-38.dxf"'
    assert header(response.content)["$ACADVER"] == [(1, "AC1009")]


def test_two_identical_calls_give_the_same_bytes() -> None:
    first = _dxf(skirt_spec(), reference="MOD-002", sizeLabel="38")
    second = _dxf(skirt_spec(), reference="MOD-002", sizeLabel="38")
    assert first.content == second.content


def _check_against_cut_patterns(spec: dict[str, Any]) -> list[dict[str, Any]]:
    dxf = blocks(_dxf(spec).content)
    cut = client.post("/v1/cut-patterns", json={"spec": spec}).json()["pieces"]
    assert len(dxf) == len(cut)
    for piece in cut:
        entities = dxf[piece["panelId"].upper()]
        assert _count(entities, "VERTEX", "1") == len(piece["cutLine"])
        assert _count(entities, "LINE", "4") == sum(n["count"] for n in piece["notches"])
        assert _count(entities, "LINE", "7") == 1
        assert _count(entities, "LINE", "6") == (1 if piece["cutOnFold"] else 0)
    return list(cut)


def test_blocks_match_the_cut_patterns_of_the_skirt() -> None:
    _check_against_cut_patterns(skirt_spec())


def test_darted_skirt_keeps_the_dart_legs_on_the_seam_line_and_dart_notches() -> None:
    spec = darted_skirt_spec()
    cut = _check_against_cut_patterns(spec)
    dxf = blocks(_dxf(spec).content)
    front = cut[0]
    entities = dxf[front["panelId"].upper()]
    seam_points = sum(len(e["points"]) - 1 for e in front["seamLine"])
    assert _count(entities, "VERTEX", "14") == seam_points
    assert any(e["edgeId"].startswith("dart") for e in front["seamLine"])
    assert _count(entities, "LINE", "4") > 0

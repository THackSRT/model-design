"""Export SVG : structure, échelle, échappement et déterminisme."""

import re
import xml.etree.ElementTree as ET

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.model import DEFAULT_POLICY, Panel
from manufacturing.export import EXPORTERS, exporter_for
from manufacturing.export.labels import CATALOGS, MULTIPLICATION_SIGN
from manufacturing.export.sheet import ExportJob
from manufacturing.export.svg import render_svg, text_safe
from tests.builders import a_pattern, rectangle, skirt_pattern

SVG = "{http://www.w3.org/2000/svg}"
NS = {"s": "http://www.w3.org/2000/svg"}
NASTY = "<script>&\"'"


def _job(panel: Panel, size_label: str | None = None, reference: str | None = None) -> ExportJob:
    pieces = compute_cut_pieces(a_pattern(panel), DEFAULT_POLICY, (), True)
    return ExportJob("test", pieces, size_label, reference)


def _skirt_job() -> ExportJob:
    pieces = compute_cut_pieces(skirt_pattern(), DEFAULT_POLICY, (), True)
    return ExportJob("straight-skirt", pieces, "38", "MOD-002")


def _root(job: ExportJob) -> ET.Element:
    return ET.fromstring(render_svg(job))


def test_root_is_in_millimetres_with_matching_viewbox() -> None:
    root = _root(_skirt_job())
    width = float(root.attrib["width"].removesuffix("mm"))
    height = float(root.attrib["height"].removesuffix("mm"))
    assert root.attrib["viewBox"] == f"0 0 {width:.2f} {height:.2f}"
    assert root.tag == f"{SVG}svg"


def test_skirt_hem_edge_measures_250_units() -> None:
    root = _root(_skirt_job())
    seam = root.find("s:g/s:polygon[@stroke-dasharray]", NS)
    assert seam is not None
    points = [tuple(map(float, p.split(","))) for p in seam.attrib["points"].split()]
    lengths = [
        abs(points[i][0] - points[(i + 1) % len(points)][0])
        for i in range(len(points))
        if abs(points[i][1] - points[(i + 1) % len(points)][1]) < 1e-9
    ]
    assert any(abs(length - 250) < 0.01 for length in lengths)


def test_no_transform_is_used_so_texts_stay_upright() -> None:
    assert b"transform" not in render_svg(_skirt_job())


def test_each_piece_has_lines_texts_and_arrowed_grainline() -> None:
    root = _root(_skirt_job())
    groups = root.findall("s:g[@data-panel-id]", NS)
    assert [g.attrib["data-panel-id"] for g in groups] == ["front", "back"]
    front = groups[0]
    assert len(front.findall("s:polygon", NS)) == 2
    assert len(front.findall("s:g[@data-role='grainline']/s:line", NS)) == 5
    texts = [t.text for t in front.findall("s:text", NS)]
    assert "38" in texts and "MOD-002" in texts
    assert any(t and t.startswith("Couper") and "sur pliure" in t for t in texts)
    assert front.find("s:g[@data-role='fold']", NS) is not None
    assert "PLIURE" in [t.text for t in front.findall("s:g[@data-role='fold']/s:text", NS)]
    assert front.find("s:g[@data-role='notches']", NS) is not None


def test_cut_text_without_fold_has_no_fold_mention() -> None:
    texts = [t.text for t in _root(_job(rectangle(100, 100))).iter(f"{SVG}text")]
    assert f"Couper 1 {MULTIPLICATION_SIGN}" in texts
    assert not any(t and "pliure" in t for t in texts)


def test_request_texts_are_escaped() -> None:
    svg = render_svg(_job(rectangle(100, 100, NASTY), NASTY, NASTY))
    assert b"<script" not in svg
    root = ET.fromstring(svg)
    assert any(NASTY in (t.text or "") for t in root.iter(f"{SVG}text"))
    group = root.find("s:g", NS)
    assert group is not None and group.attrib["data-panel-id"] == NASTY


def test_garment_type_and_control_characters_are_escaped() -> None:
    root = _root(ExportJob("</title><x/>\x00", ()))
    title = root.find("s:title", NS)
    assert title is not None and title.text == "</title><x/>"
    assert text_safe("a\x00b") == "ab"


def test_numbers_have_two_fixed_decimals_and_lf_endings() -> None:
    svg = render_svg(_skirt_job()).decode()
    assert "\r" not in svg
    values = re.findall(r' (?:x|y|x1|y1|x2|y2)="([^"]+)"', svg)
    assert values
    for value in values:
        assert re.fullmatch(r"-?\d+\.\d\d", value)


def test_output_is_identical_between_calls() -> None:
    assert render_svg(_skirt_job()) == render_svg(_skirt_job())


def test_formats_dispatch_is_a_dictionary_with_svg_only_for_now() -> None:
    assert set(EXPORTERS) == {"svg"}
    assert exporter_for("svg") is render_svg
    assert set(CATALOGS) == {"fr"}

"""Pantalon : taille et hanches cousues, longueurs, coutures justes, crans, symétrie, erreurs."""

import re
from dataclasses import replace

import pytest

from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Edge, Pattern, Point
from tests.builders import minimal_measurements, reference_measurements

PARAMS = {"length_mm": 1000.0, "hem_girth_mm": 440.0}
PANELS = {"front-left", "front-right", "back-left", "back-right"}


def _trousers(**params: float) -> Pattern:
    return draft("trousers", reference_measurements(), {**PARAMS, **params})


def _waist(pattern: Pattern) -> float:
    total = 0.0
    for panel in pattern.panels:
        total += sum(edge_length(e) for e in panel.edges if e.id.startswith("waist-"))
    return total


def test_four_panels_with_the_expected_ids() -> None:
    assert {p.id for p in _trousers().panels} == PANELS


def test_sewn_waist_is_waist_plus_ease() -> None:
    assert _waist(_trousers()) == pytest.approx(640 + 10, abs=0.5)
    assert _waist(_trousers(waist_ease_mm=30)) == pytest.approx(640 + 30, abs=0.5)


def _hip_line(pattern: Pattern) -> float:
    return sum(
        abs(p.edge("side-upper").controls[0][0] - p.edge("rise").start[0]) for p in pattern.panels
    )


def test_hip_line_is_hips_plus_ease() -> None:
    for ease in (50, 100):
        assert _hip_line(_trousers(hip_ease_mm=ease)) == pytest.approx(960 + ease, abs=0.5)


def test_height_from_waist_to_hem_is_the_given_length() -> None:
    for panel in _trousers().panels:
        heights = {p[1] for e in panel.edges for p in (e.start, e.end)}
        assert min(heights) == 0
        assert max(heights) == 1000
        assert panel.edge("hem").role == "hem"
        assert panel.edge("side-upper").role == "seam"


def test_hem_matches_the_given_girth() -> None:
    pattern = _trousers(hem_girth_mm=520)
    for side in ("left", "right"):
        hem = sum(edge_length(pattern.panel(f"{k}-{side}").edge("hem")) for k in ("front", "back"))
        assert hem == pytest.approx(520, abs=0.5)


def test_without_hem_girth_the_leg_is_straight_from_the_knee() -> None:
    pattern = draft("trousers", reference_measurements(), {"length_mm": 1000.0})
    for panel in pattern.panels:
        lower, hem = panel.edge("side-lower"), panel.edge("hem")
        assert lower.start[0] == pytest.approx(lower.end[0], abs=0.01)
        assert panel.edge("inseam-lower").start[0] == pytest.approx(
            panel.edge("inseam-lower").end[0], abs=0.01
        )
        assert hem.start[1] == 0
    assert pattern.estimated_measurements == (
        "back_waist_length_mm",
        "bust_girth_mm",
        "bust_point_width_mm",
        "cervicale_height_mm",
        "hip_height_mm",
        "knee_girth_mm",
        "thigh_girth_mm",
        "waist_height_mm",
    )


def test_every_seam_is_exact_within_half_a_millimetre() -> None:
    for pattern in (_trousers(), draft("trousers", reference_measurements(), {"length_mm": 900})):
        ids = {s.id for s in pattern.seams}
        assert {"inseam-upper-right", "side-upper-left", "center-back-crotch"} <= ids
        assert not any(i.startswith("crotch-") for i in ids)
        for seam in pattern.seams:
            a = pattern.panel(seam.a[0]).edge(seam.a[1])
            b = pattern.panel(seam.b[0]).edge(seam.b[1])
            assert abs(edge_length(a) - edge_length(b)) < 0.5


def test_notches_are_on_the_hip_line_and_the_fork() -> None:
    for panel in _trousers().panels:
        by_edge = {n.edge_id: n.distance_mm for n in panel.notches}
        hip = panel.edge("side-upper")
        assert by_edge["side-upper"] in (0.0, round(edge_length(hip), 2))
        rise = edge_length(panel.edge("rise"))
        assert min(by_edge["rise"], rise - by_edge["rise"]) == pytest.approx(0, abs=0.01)


def test_left_and_right_pieces_are_mirrored_and_counterclockwise() -> None:
    pattern = _trousers()
    for left, right in (("front-left", "front-right"), ("back-left", "back-right")):
        a, b = pattern.panel(left), pattern.panel(right)
        assert signed_area(a.edges) == pytest.approx(signed_area(b.edges), rel=1e-6)
        assert signed_area(a.edges) > 0
        for edge in a.edges:
            assert edge_length(edge) == pytest.approx(edge_length(b.edge(edge.id)), abs=0.01)


def test_the_crotch_curve_leaves_the_rise_vertically_and_arrives_horizontally() -> None:
    for panel in _trousers().panels:
        crotch = panel.edge("crotch")
        ends = (crotch.start, crotch.end)
        corner = crotch.controls[0]
        assert any(abs(p[0] - corner[0]) < 1e-9 for p in ends)  # une tangente verticale
        assert any(abs(p[1] - corner[1]) < 1e-9 for p in ends)  # une tangente horizontale


def test_crotch_height_is_required() -> None:
    raw = replace(reference_measurements(), crotch_height_mm=None)
    with pytest.raises(DraftingError) as error:
        draft("trousers", raw, PARAMS)
    assert error.value.kind == "measurement-required"
    assert "crotchHeightMm" in error.value.detail
    assert not re.findall(r"\d", error.value.detail)


def test_crotch_above_the_hips_is_refused() -> None:
    raw = replace(reference_measurements(), hip_height_mm=700, crotch_height_mm=740)
    with pytest.raises(DraftingError) as error:
        draft("trousers", raw, PARAMS)
    assert error.value.kind == "inconsistent-measurements"


def test_length_above_the_crotch_is_refused() -> None:
    with pytest.raises(DraftingError) as error:
        _trousers(length_mm=300)
    assert error.value.kind == "trousers-shorter-than-crotch"


def test_a_given_thigh_girth_is_not_reported_as_estimated() -> None:
    raw = replace(reference_measurements(), thigh_girth_mm=600, knee_girth_mm=380)
    pattern = draft("trousers", raw, PARAMS)
    assert "thigh_girth_mm" not in pattern.estimated_measurements
    assert "knee_girth_mm" not in pattern.estimated_measurements


def test_the_middle_seams_join_rise_and_crotch_curve_of_both_sides() -> None:
    pattern = _trousers()
    seams = {s.id: s for s in pattern.seams}
    for middle, (left, right) in {
        "center-front": ("front-left", "front-right"),
        "center-back": ("back-left", "back-right"),
    }.items():
        total = {}
        for side in (left, right):
            total[side] = sum(edge_length(pattern.panel(side).edge(e)) for e in ("rise", "crotch"))
        assert abs(total[left] - total[right]) < 0.5
        for part in ("rise", "crotch"):
            assert seams[f"{middle}-{part}"].a == (left, part)
            assert seams[f"{middle}-{part}"].b == (right, part)


def test_inseam_front_and_back_of_a_leg_have_the_same_length() -> None:
    pattern = _trousers()
    for side in ("left", "right"):
        for part in ("inseam-upper", "inseam-lower"):
            front = edge_length(pattern.panel(f"front-{side}").edge(part))
            back = edge_length(pattern.panel(f"back-{side}").edge(part))
            assert abs(front - back) < 0.5


def test_the_back_fork_is_higher_than_the_front_fork() -> None:
    pattern = _trousers()
    front = max(p[1] for p in _ends(pattern.panel("front-left").edge("rise")))
    back = max(p[1] for p in _ends(pattern.panel("back-right").edge("rise")))
    fork_front = min(p[1] for p in _ends(pattern.panel("front-left").edge("rise")))
    fork_back = min(p[1] for p in _ends(pattern.panel("back-right").edge("rise")))
    assert front == back == 1000
    assert fork_back > fork_front


def _ends(edge: Edge) -> tuple[Point, Point]:
    return edge.start, edge.end


def test_estimates_that_move_the_crotch_are_declared() -> None:
    raw = replace(minimal_measurements(), crotch_height_mm=740)
    pattern = draft("trousers", raw, {"length_mm": 1000.0})
    assert {"cervicale_height_mm", "back_waist_length_mm", "waist_height_mm"} <= set(
        pattern.estimated_measurements
    )
    given = replace(raw, back_waist_length_mm=330, cervicale_height_mm=1400)
    declared = set(draft("trousers", given, {"length_mm": 1000.0}).estimated_measurements)
    assert not {"cervicale_height_mm", "back_waist_length_mm"} & declared

"""Corsage sans manches : poitrine et taille cousues, côtés, épaules, pinces, encolure."""

import re
from dataclasses import replace

import pytest

from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Panel, Pattern
from tests.builders import full_measurements, reference_measurements, self_crossings


def _bodice(**params: float) -> Pattern:
    return draft("bodice", reference_measurements("bodice"), params)


def _sewn(panel: Panel) -> float:
    return sum(edge_length(e) for e in panel.edges if e.id.startswith("hem-"))


def test_three_panels_with_the_expected_ids_and_no_sleeve() -> None:
    pattern = _bodice()
    assert [p.id for p in pattern.panels] == ["front", "back-right", "back-left"]
    assert pattern.panel("front").cut_on_fold
    assert pattern.panel("front").edge("fold").role == "fold"


def test_bust_girth_at_the_bust_line_is_bust_plus_ease() -> None:
    for ease in (0, 60, 120):
        pattern = _bodice(bust_ease_mm=ease)
        front = pattern.panel("front").edge("side-upper").start[0]
        back = pattern.panel("back-right").edge("side-upper").start[0]
        assert 2 * (front + back) == pytest.approx(900 + ease, abs=1)


def test_sewn_waist_is_waist_plus_ease() -> None:
    for ease in (0, 40, 90):
        pattern = _bodice(waist_ease_mm=ease)
        total = 2 * _sewn(pattern.panel("front")) + _sewn(pattern.panel("back-right"))
        total += _sewn(pattern.panel("back-left"))
        assert total == pytest.approx(640 + ease, abs=0.5)


def test_sewn_waist_is_exact_below_the_waist_too() -> None:
    plain, longer = _bodice(), _bodice(length_below_waist_mm=150)
    for name in ("front", "back-right"):
        assert _sewn(longer.panel(name)) == pytest.approx(_sewn(plain.panel(name)), abs=0.01)
    heights = {p[1] for e in longer.panel("front").edges for p in (e.start, e.end)}
    assert min(heights) == -150
    assert longer.panel("front").edge("side-below").role == "seam"


def test_every_seam_is_exact_and_shoulders_and_sides_match_to_the_hundredth() -> None:
    for pattern in (_bodice(), _bodice(length_below_waist_mm=100, back_neck_depth_mm=40)):
        for seam in pattern.seams:
            a = pattern.panel(seam.a[0]).edge(seam.a[1])
            b = pattern.panel(seam.b[0]).edge(seam.b[1])
            tolerance = 0.5 if seam.id.startswith("armhole") else 0.05
            assert abs(edge_length(a) - edge_length(b) - seam.ease_mm) < tolerance
        ids = {s.id for s in pattern.seams}
        assert {"shoulder-right", "side-upper-left", "side-lower-right", "center-back"} <= ids
        assert {"bust-dart", "front-dart-1", "back-right-dart-1", "back-left-dart-1"} <= ids


def test_dart_legs_have_the_same_length() -> None:
    for panel in _bodice().panels:
        for left, right in (
            ("dart-1-left", "dart-1-right"),
            ("bust-dart-lower", "bust-dart-upper"),
        ):
            if any(e.id == left for e in panel.edges):
                assert edge_length(panel.edge(left)) == pytest.approx(
                    edge_length(panel.edge(right)), abs=0.01
                )


def test_the_front_is_taller_than_the_back_by_the_bust_dart() -> None:
    pattern = _bodice()
    front, back = pattern.panel("front"), pattern.panel("back-right")
    gap = front.edge("bust-dart-upper").end[1] - front.edge("bust-dart-lower").start[1]
    assert gap > 0
    assert front.edge("shoulder").end[1] - back.edge("shoulder").end[1] == pytest.approx(
        gap, abs=0.01
    )
    assert back.edge("shoulder").end[1] == pytest.approx(380, abs=0.01)


def test_the_sleeveless_armhole_and_the_neck_are_openings() -> None:
    for panel in _bodice().panels:
        assert panel.edge("armhole").role == "opening"
        assert panel.edge("neck").role == "opening"
        assert panel.edge("shoulder").role == "seam"
        assert not panel.notches


def test_neck_gets_longer_with_the_front_depth() -> None:
    lengths = [
        edge_length(_bodice(front_neck_depth_mm=d).panel("front").edge("neck")) for d in (0, 40, 80)
    ]
    assert lengths == sorted(lengths)
    assert len(set(lengths)) == 3
    back = [
        edge_length(_bodice(back_neck_depth_mm=d).panel("back-right").edge("neck")) for d in (0, 40)
    ]
    assert back[0] < back[1]


def test_a_front_neckline_below_the_bust_line_is_refused() -> None:
    with pytest.raises(DraftingError) as error:
        _bodice(front_neck_depth_mm=250)
    assert error.value.kind == "neckline-too-deep"
    with pytest.raises(DraftingError) as error:
        _bodice(back_neck_depth_mm=400)
    assert error.value.kind == "neckline-too-deep"


def test_the_deepest_accepted_neckline_stays_above_the_bust_line() -> None:
    front = _bodice(front_neck_depth_mm=150).panel("front")
    assert front.edge("neck").end[1] >= front.edge("bust-dart-lower").end[1]


@pytest.mark.parametrize("missing", ["bust_girth_mm", "back_waist_length_mm"])
def test_an_essential_measurement_is_required(missing: str) -> None:
    raw = replace(reference_measurements("bodice"), **{missing: None})
    with pytest.raises(DraftingError) as error:
        draft("bodice", raw, {})
    assert error.value.kind == "measurement-required"
    assert {"bust_girth_mm": "bustGirthMm", "back_waist_length_mm": "backWaistLengthMm"}[
        missing
    ] in error.value.detail
    assert not re.findall(r"\d", error.value.detail)


def test_estimates_are_listed_only_when_used() -> None:
    assert _bodice().estimated_measurements == (
        "armscye_depth_mm",
        "bust_point_width_mm",
        "front_waist_length_mm",
        "neck_shoulder_to_bust_point_mm",
        "shoulder_width_mm",
    )
    pattern = draft("bodice", replace(full_measurements(), armscye_depth_mm=130), {})
    assert pattern.estimated_measurements == ()


def test_inconsistent_measurements_are_refused_without_a_value() -> None:
    cases = [
        {"front_waist_length_mm": 600},  # devant beaucoup plus long que le dos
        {"neck_shoulder_to_bust_point_mm": 440},  # poitrine sous la taille
        {"armscye_depth_mm": 300},  # aisselle sous la poitrine
    ]
    for case in cases:
        raw = replace(reference_measurements("bodice"), **case)
        with pytest.raises(DraftingError) as error:
            draft("bodice", raw, {})
        assert error.value.kind == "inconsistent-measurements"
        assert not re.findall(r"\d", error.value.detail)


def test_panels_are_simple_counterclockwise_contours() -> None:
    for pattern in (_bodice(), _bodice(length_below_waist_mm=200, front_neck_depth_mm=100)):
        for panel in pattern.panels:
            assert signed_area(panel.edges) > 0
            assert self_crossings(panel) == 0

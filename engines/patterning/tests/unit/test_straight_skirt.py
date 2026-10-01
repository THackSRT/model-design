import re
from dataclasses import replace

import pytest

from patterning.core.body import complete_body
from patterning.core.curves import point_at_length
from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length
from patterning.core.model import Panel, Pattern
from tests.builders import reference_measurements

LENGTH = 600


def _skirt(**params: float) -> Pattern:
    return draft("straight-skirt", reference_measurements(), {"length_mm": LENGTH, **params})


def _sewn_waist(panel: Panel) -> float:
    return sum(edge_length(e) for e in panel.edges if e.id.startswith("waist-"))


def _whole_waist(pattern: Pattern) -> float:
    front, right, left = (pattern.panel(i) for i in ("front", "back-right", "back-left"))
    return 2 * _sewn_waist(front) + _sewn_waist(right) + _sewn_waist(left)


def test_sewn_waist_is_waist_girth_plus_ease() -> None:
    assert _whole_waist(_skirt(waist_ease_mm=10)) == pytest.approx(640 + 10, abs=0.5)


def test_hip_girth_at_the_hip_line_is_hip_girth_plus_ease() -> None:
    pattern = _skirt(hip_ease_mm=40)
    front_half = pattern.panel("front").edge("side-lower").end[0]
    back_half = pattern.panel("back-right").edge("side-lower").end[0]
    assert 2 * (front_half + back_half) == pytest.approx(960 + 40, abs=0.5)


def test_length_at_the_center_front_is_the_requested_length() -> None:
    assert edge_length(_skirt().panel("front").edge("fold")) == pytest.approx(LENGTH, abs=0.5)


def test_pieces_are_a_front_on_fold_and_two_backs() -> None:
    pattern = _skirt()
    assert [(p.id, p.cut_on_fold) for p in pattern.panels] == [
        ("front", True),
        ("back-right", False),
        ("back-left", False),
    ]


def test_each_dart_has_two_legs_of_the_same_length_sewn_together() -> None:
    pattern = _skirt()
    darts = [s for s in pattern.seams if s.a[0] == s.b[0]]
    assert len(darts) == 1 + 2 + 2  # une pince par demi-devant, deux par demi-dos
    for seam in darts:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert edge_length(a) == pytest.approx(edge_length(b), abs=0.5)


def test_sides_and_center_back_are_sewn_with_the_same_length() -> None:
    pattern = _skirt(hem_flare_mm=100)
    assert {"side-lower-right", "side-upper-left", "center-back"} <= {s.id for s in pattern.seams}
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert edge_length(a) == pytest.approx(edge_length(b), abs=0.5)


def test_hip_line_notches_sit_at_the_same_distance_from_the_waist_on_every_side() -> None:
    pattern = _skirt()
    depth = complete_body(reference_measurements())[0].waist_hip_depth_mm
    for panel in pattern.panels:
        notch = next(n for n in panel.notches if n.edge_id == "side-upper")
        _, y = point_at_length(panel.edge("side-upper"), notch.distance_mm)
        assert LENGTH - y == pytest.approx(depth, abs=0.05)


def test_center_front_and_center_back_are_notched_at_the_waist() -> None:
    for panel in _skirt().panels:
        notch = next(n for n in panel.notches if n.edge_id.startswith("waist-"))
        x, y = point_at_length(panel.edge(notch.edge_id), notch.distance_mm)
        assert y == LENGTH
        assert x in (0.0, max(e.end[0] for e in panel.edges))


def test_hem_is_wider_by_the_requested_flare() -> None:
    plain, flared = _skirt(hem_flare_mm=0), _skirt(hem_flare_mm=80)
    widening = edge_length(flared.panel("front").edge("hem")) - edge_length(
        plain.panel("front").edge("hem")
    )
    assert widening == pytest.approx(20, abs=0.01)


def test_waist_close_to_the_hips_keeps_the_darts_and_still_the_right_waist() -> None:
    wide = reference_measurements().__class__(
        **{**reference_measurements().__dict__, "waist_girth_mm": 900}
    )
    pattern = draft("straight-skirt", wide, {"length_mm": LENGTH})
    assert [s.id for s in pattern.seams if s.a[0] == s.b[0] == "front"] == ["front-dart-1"]
    assert _whole_waist(pattern) == pytest.approx(900 + 10, abs=0.5)


def test_estimated_measurements_used_by_the_skirt_are_listed() -> None:
    assert _skirt().estimated_measurements == (
        "bust_girth_mm",
        "bust_point_width_mm",
        "hip_height_mm",
        "waist_height_mm",
    )


def test_refuses_a_skirt_that_stops_above_the_hips() -> None:
    with pytest.raises(DraftingError) as error:
        _skirt(length_mm=220)
    assert error.value.kind == "skirt-shorter-than-hip-depth"


def test_same_inputs_give_the_same_pattern() -> None:
    assert _skirt() == _skirt()


def _topology(pattern: Pattern) -> list[tuple[str, list[str]]]:
    return [(p.id, [e.id for e in p.edges]) for p in pattern.panels]


def test_every_size_has_the_same_pieces_and_edges_in_the_same_order() -> None:
    base = reference_measurements()
    sizes = [
        replace(base, waist_girth_mm=w, hip_girth_mm=h)
        for w, h in (
            (640, 960),
            (700, 960),
            (760, 960),
            (900, 960),
            (1000, 960),
            (520, 800),
            (1100, 1000),
        )
    ]
    topologies = [_topology(draft("straight-skirt", m, {"length_mm": LENGTH})) for m in sizes]
    assert all(t == topologies[0] for t in topologies)
    for m in sizes:
        pattern = draft("straight-skirt", m, {"length_mm": LENGTH})
        assert _whole_waist(pattern) == pytest.approx(m.waist_girth_mm + 10, abs=0.5)


def test_problem_details_never_carry_a_measurement_value() -> None:
    with pytest.raises(DraftingError) as short:
        _skirt(length_mm=220)
    assert set(re.findall(r"\d+", short.value.detail)) <= {"50"}
    broken = replace(reference_measurements(), hip_height_mm=700, crotch_height_mm=740)
    with pytest.raises(DraftingError) as inconsistent:
        draft("straight-skirt", replace(broken, waist_height_mm=600), {"length_mm": LENGTH})
    assert not re.findall(r"\d", inconsistent.value.detail)


def test_a_measurement_the_skirt_does_not_use_cannot_make_it_fail() -> None:
    odd = replace(reference_measurements(), hip_height_mm=700, crotch_height_mm=740)
    assert draft("straight-skirt", odd, {"length_mm": LENGTH}).panels

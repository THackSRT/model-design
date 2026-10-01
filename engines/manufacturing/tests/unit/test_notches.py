"""Crans demandés, de la spécification et automatiques."""

from dataclasses import replace

import pytest

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from manufacturing.core.allowances import cut_outline
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.model import (
    AllowancePolicy,
    CutOutline,
    FinishingSettings,
    NotchPlacement,
    NotchRequest,
    NotchSource,
    Pattern,
    Seam,
)
from manufacturing.core.notches import place_notch, place_notches
from manufacturing.spec.cut_patterns import to_pattern
from tests.builders import a_pattern, polygon_panel, rectangle, skirt_pattern
from tests.darted import darted_skirt_spec

POLICY = AllowancePolicy(default_mm=10)


def _rect_outline() -> CutOutline:
    return cut_outline(rectangle(100, 200), POLICY)


def test_requested_notch_is_measured_along_the_seam_from_the_edge_start() -> None:
    mark = place_notch(_rect_outline(), NotchPlacement("e1", 50), NotchSource.REQUESTED)
    assert mark.position == (100, 50)  # e1 va de (100, 0) à (100, 200)
    assert mark.source is NotchSource.REQUESTED
    assert mark.distance_mm == 50


def test_notch_cut_goes_from_cut_line_inward_and_is_6_mm_deep() -> None:
    mark = place_notch(_rect_outline(), NotchPlacement("e1", 50), NotchSource.REQUESTED)
    assert mark.segments == (((110, 50), (104, 50)),)


def test_notch_on_a_zero_allowance_edge_is_3_mm_inward() -> None:
    outline = cut_outline(rectangle(100, 200), AllowancePolicy(default_mm=0))
    mark = place_notch(outline, NotchPlacement("e1", 50), NotchSource.REQUESTED)
    assert mark.segments == (((100, 50), (97, 50)),)


def test_shallow_allowance_gives_a_shallower_notch() -> None:
    outline = cut_outline(rectangle(100, 200), AllowancePolicy(default_mm=4))
    mark = place_notch(outline, NotchPlacement("e1", 50), NotchSource.REQUESTED)
    assert mark.segments == (((104, 50), (100, 50)),)


def test_clockwise_contour_keeps_the_notch_inward() -> None:
    panel = polygon_panel([(0, 0), (0, 200), (100, 200), (100, 0)], "cw")
    mark = place_notch(cut_outline(panel, POLICY), NotchPlacement("e0", 50), NotchSource.AUTO)
    assert mark.segments == (((-10, 50), (-4, 50)),)


@pytest.mark.parametrize(("count", "ys"), [(2, [48, 52]), (3, [46, 50, 54])])
def test_multiple_notches_are_4_mm_apart_and_centered(count: int, ys: list[float]) -> None:
    mark = place_notch(_rect_outline(), NotchPlacement("e1", 50, count), NotchSource.REQUESTED)
    assert [a[1] for a, _ in mark.segments] == ys


def test_notch_beyond_the_edge_is_rejected_but_the_tolerance_is_allowed() -> None:
    place_notch(_rect_outline(), NotchPlacement("e1", 200.01), NotchSource.REQUESTED)
    with pytest.raises(ManufacturingError) as error:
        place_notch(_rect_outline(), NotchPlacement("e1", 200.02), NotchSource.REQUESTED)
    assert error.value.kind == "notch-outside-edge"


def test_unknown_edge_and_unknown_panel_are_rejected() -> None:
    with pytest.raises(ManufacturingError) as error:
        place_notch(_rect_outline(), NotchPlacement("nope", 1), NotchSource.REQUESTED)
    assert error.value.kind == "unknown-edge"
    pattern = a_pattern(rectangle(100, 200))
    request = NotchRequest("ghost", NotchPlacement("e0", 1))
    with pytest.raises(ManufacturingError) as error:
        compute_cut_pieces(pattern, POLICY, (request,))
    assert error.value.kind == "unknown-edge"


def test_skirt_has_exactly_one_auto_notch_per_piece_at_start_of_side_upper() -> None:
    for piece in compute_cut_pieces(skirt_pattern()):
        assert [(n.edge_id, n.distance_mm, n.count, n.source) for n in piece.notches] == [
            ("side-upper", 0.0, 1, NotchSource.AUTO)
        ]
        assert piece.notches[0].position == (250, 402)


def test_auto_notches_can_be_turned_off() -> None:
    pieces = compute_cut_pieces(skirt_pattern(), auto_notches=False)
    assert all(not piece.notches for piece in pieces)


def test_requested_notch_replaces_the_auto_notch_at_the_same_place() -> None:
    request = NotchRequest("front", NotchPlacement("side-upper", 0.004, 2))
    front = compute_cut_pieces(skirt_pattern(), requests=(request,))[0]
    assert [(n.count, n.source) for n in front.notches] == [(2, NotchSource.REQUESTED)]


def _skirt_with_spec_notch() -> Pattern:
    skirt = skirt_pattern()
    front = replace(skirt.panels[0], notches=(NotchPlacement("side-upper", 0, 3),))
    return replace(skirt, panels=(front, *skirt.panels[1:]))


def test_spec_notch_is_requested_and_replaces_the_auto_notch() -> None:
    piece = compute_cut_pieces(_skirt_with_spec_notch())[0]
    assert [(n.count, n.source) for n in piece.notches] == [(3, NotchSource.REQUESTED)]


def test_request_wins_over_a_spec_notch_at_the_same_place() -> None:
    request = NotchRequest("front", NotchPlacement("side-upper", 0, 2))
    piece = compute_cut_pieces(_skirt_with_spec_notch(), requests=(request,))[0]
    assert [n.count for n in piece.notches] == [2]


def test_spec_notch_outside_edge_is_rejected() -> None:
    panel = replace(rectangle(100, 200), notches=(NotchPlacement("e0", 500),))
    with pytest.raises(ManufacturingError) as error:
        compute_cut_pieces(a_pattern(panel), POLICY)
    assert error.value.kind == "notch-outside-edge"


def test_no_auto_notch_when_the_turn_is_30_degrees_or_more() -> None:
    panel = rectangle(100, 200)
    seams = (Seam("s1", (panel.id, "e0"), ("x", "e0")), Seam("s2", (panel.id, "e1"), ("x", "e1")))
    pattern = Pattern("t", (panel,), seams)
    assert compute_cut_pieces(pattern, POLICY)[0].notches == ()


def test_place_notches_orders_marks_by_edge_then_distance() -> None:
    panel = rectangle(100, 200)
    outline = cut_outline(panel, POLICY)
    requests = tuple(
        NotchRequest(panel.id, NotchPlacement(e, d)) for e, d in [("e1", 90), ("e0", 5), ("e1", 10)]
    )
    marks = place_notches(
        a_pattern(panel), panel, outline, FinishingSettings(requests=requests, auto_notches=False)
    )
    assert [(m.edge_id, m.distance_mm) for m in marks] == [("e0", 5), ("e1", 10), ("e1", 90)]


def test_a_piece_and_its_mirror_copy_get_the_same_notches() -> None:
    spec = darted_skirt_spec()
    pattern = to_pattern(GarmentSpec.model_validate(spec))
    pieces = {p.outline.panel_id: p for p in compute_cut_pieces(pattern)}
    right = sorted(n.position for n in pieces["back-right"].notches)
    left = sorted((267.5 - x, y) for x, y in (n.position for n in pieces["back-left"].notches))
    assert len(right) == len(left)
    for (rx, ry), (lx, ly) in zip(right, sorted(left), strict=True):
        assert (rx, ry) == pytest.approx((lx, ly), abs=0.05)


def test_request_at_the_end_of_an_edge_replaces_the_auto_notch_starting_the_next() -> None:
    request = NotchRequest("front", NotchPlacement("side-lower", 402))
    front = compute_cut_pieces(skirt_pattern(), requests=(request,))[0]
    assert [(n.edge_id, n.source) for n in front.notches] == [("side-lower", NotchSource.REQUESTED)]

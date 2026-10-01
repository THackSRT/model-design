"""Pinces : détection, pont de la ligne de coupe, jambes sans valeur de couture, crans."""

import pytest

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from manufacturing.core.darts import dart_pairs
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.geometry import is_simple
from manufacturing.core.model import AllowancePolicy, NotchSource, Pattern, Seam
from manufacturing.spec.cut_patterns import to_pattern
from tests.builders import polygon_panel, rectangle
from tests.darted import darted_rectangle, darted_skirt_spec

POLICY = AllowancePolicy(default_mm=10)


def _pattern() -> Pattern:
    panel, seam = darted_rectangle()
    return Pattern("t", (panel,), (seam,))


def test_a_dart_is_two_consecutive_edges_sewn_together_on_the_same_panel() -> None:
    pattern = _pattern()
    assert dart_pairs(pattern, pattern.panels[0]) == ((3, 4),)
    other = Pattern("t", pattern.panels, (Seam("s", ("p", "e3"), ("q", "e4")),))
    assert dart_pairs(other, pattern.panels[0]) == ()
    far = Pattern("t", pattern.panels, (Seam("s", ("p", "e1"), ("p", "e4")),))
    assert dart_pairs(far, pattern.panels[0]) == ()


def _two_darts(first: tuple[str, str], second: tuple[str, str]) -> Pattern:
    points = [(0, 0), (200, 0), (200, 200), (160, 200), (150, 150), (140, 200)]
    points += [(100, 200), (90, 150), (80, 200), (0, 200)]
    panel = polygon_panel(points, "p")  # arêtes e0..e9 ; jambes e3,e4 et e6,e7 (ou e5,e6)
    seams = (
        Seam("d1", ("p", first[0]), ("p", first[1])),
        Seam("d2", ("p", second[0]), ("p", second[1])),
    )
    return Pattern("t", (panel,), seams)


def test_two_separated_darts_are_accepted() -> None:
    pattern = _two_darts(("e3", "e4"), ("e6", "e7"))
    assert dart_pairs(pattern, pattern.panels[0]) == ((3, 4), (6, 7))


@pytest.mark.parametrize(
    ("first", "second"),
    [(("e3", "e4"), ("e4", "e5")), (("e3", "e4"), ("e5", "e6")), (("e4", "e5"), ("e3", "e4"))],
)
def test_adjacent_or_overlapping_darts_are_rejected(
    first: tuple[str, str], second: tuple[str, str]
) -> None:
    pattern = _two_darts(first, second)
    with pytest.raises(ManufacturingError) as error:
        compute_cut_pieces(pattern, POLICY)
    assert error.value.kind == "adjacent-darts"


def test_cut_line_bridges_the_dart() -> None:
    piece = compute_cut_pieces(_pattern(), POLICY)[0]
    cut = list(piece.outline.cut_line)
    assert is_simple(cut)
    assert (60, 210) in cut
    assert (40, 210) in cut
    assert all(y >= 209.99 for x, y in cut if 40 < x < 60)
    assert piece.cut_area_mm2 == 120 * 220


def test_seam_line_keeps_the_dart_legs_with_zero_allowance() -> None:
    piece = compute_cut_pieces(_pattern(), POLICY)[0]
    legs = {e.edge_id: e for e in piece.outline.seam_edges if e.edge_id in {"e3", "e4"}}
    assert set(legs) == {"e3", "e4"}
    assert all(e.allowance_mm == 0 for e in legs.values())
    assert legs["e3"].points == ((60, 200), (50, 150))


def test_automatic_notches_mark_both_ends_of_the_bridge() -> None:
    piece = compute_cut_pieces(_pattern(), POLICY)[0]
    marks = {(n.edge_id, n.distance_mm): n for n in piece.notches}
    assert set(marks) == {("e2", 40.0), ("e5", 0.0)}
    assert all(n.source is NotchSource.AUTO and n.count == 1 for n in marks.values())
    assert marks[("e2", 40.0)].position == (60, 200)
    assert marks[("e2", 40.0)].segments == (((60, 210), (60, 204)),)


def test_no_dart_notch_when_automatic_notches_are_off() -> None:
    assert compute_cut_pieces(_pattern(), POLICY, auto_notches=False)[0].notches == ()


def test_explicit_nonzero_allowance_on_a_dart_leg_is_rejected() -> None:
    pattern = _pattern()
    with pytest.raises(ManufacturingError) as error:
        compute_cut_pieces(pattern, AllowancePolicy(by_edge={("p", "e3"): 5}))
    assert error.value.kind == "allowance-on-dart"
    compute_cut_pieces(pattern, AllowancePolicy(by_edge={("p", "e3"): 0}))


def test_a_seam_between_non_consecutive_edges_is_not_a_dart() -> None:
    panel = rectangle(100, 200)
    plain = compute_cut_pieces(Pattern("t", (panel,)), POLICY)[0]
    far = Pattern("t", (panel,), (Seam("s", ("rect", "e0"), ("rect", "e2")),))
    assert compute_cut_pieces(far, POLICY)[0].outline == plain.outline


def test_real_darted_skirt_edge_in_two_seams_gets_its_junction_notch() -> None:
    pattern = to_pattern(GarmentSpec.model_validate(darted_skirt_spec()))
    front = compute_cut_pieces(pattern)[0]
    marks = {(n.edge_id, n.distance_mm) for n in front.notches}
    assert ("side-upper", 0.0) in marks  # cousu au dos droit et au dos gauche
    assert {"waist-1", "waist-2"} <= {edge for edge, _ in marks}
    assert is_simple(list(front.outline.cut_line))

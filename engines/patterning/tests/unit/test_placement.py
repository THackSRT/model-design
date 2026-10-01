"""Placement des pièces autour du corps (ADR 0013) : le cœur le décide, `spec` le traduit."""

import pytest

from patterning.core.drafting import draft
from patterning.core.garments.parts import mirror_panel
from patterning.core.model import BodySide, Facing, Landmark, Pattern, Placement, Zone
from patterning.spec.convert import to_spec
from tests.builders import REFERENCE_PARAMS, reference_measurements

CASES = list(REFERENCE_PARAMS)
GARMENT = {case: "bodice" if case.startswith("bodice") else case for case in CASES}


def _pattern(case: str) -> Pattern:
    return draft(GARMENT[case], reference_measurements(case), REFERENCE_PARAMS[case])


def _placement(case: str, panel_id: str) -> Placement:
    placement = _pattern(case).panel(panel_id).placement
    assert placement is not None
    return placement


def _summary(case: str, panel_id: str) -> tuple[Zone, BodySide, Facing, Landmark]:
    p = _placement(case, panel_id)
    return p.zone, p.body_side, p.facing, p.landmark


@pytest.mark.parametrize("case", CASES)
def test_every_panel_of_every_garment_is_placed(case: str) -> None:
    assert all(p.placement is not None for p in _pattern(case).panels)


@pytest.mark.parametrize("case", CASES)
def test_the_anchor_is_a_point_of_the_panel_outline(case: str) -> None:
    for panel in _pattern(case).panels:
        assert panel.placement is not None
        xs = [p[0] for e in panel.edges for p in (e.start, e.end, *e.controls)]
        ys = [p[1] for e in panel.edges for p in (e.start, e.end, *e.controls)]
        x, y = panel.placement.anchor
        assert min(xs) - 1e-6 <= x <= max(xs) + 1e-6
        assert min(ys) - 1e-6 <= y <= max(ys) + 1e-6


def test_straight_skirt_front_is_on_the_fold_at_the_waist() -> None:
    placement = _placement("straight-skirt", "front")
    assert (placement.zone, placement.body_side, placement.facing) == (
        Zone.TORSO,
        BodySide.CENTER,
        Facing.FRONT,
    )
    assert placement.landmark is Landmark.WAIST
    assert placement.anchor == (0.0, 600.0)  # haut du pli (longueur 600)
    assert (placement.offset_mm, placement.clearance_mm) == (0.0, 30.0)


def test_straight_skirt_backs_are_one_per_side_at_the_center_back() -> None:
    right = _placement("straight-skirt", "back-right")
    left = _placement("straight-skirt", "back-left")
    assert (right.body_side, right.facing, right.anchor) == (BodySide.RIGHT, Facing.BACK, (0, 600))
    assert (left.body_side, left.facing) == (BodySide.LEFT, Facing.BACK)
    pattern = _pattern("straight-skirt")
    # le dos gauche est en miroir : son bord de milieu dos est inversé, l'ancre le suit
    assert left.anchor == pattern.panel("back-left").edge("center-back").end


def test_circle_skirt_pieces_are_centered_and_the_band_sits_on_the_waist() -> None:
    assert _summary("circle-skirt", "front") == (
        Zone.TORSO,
        BodySide.CENTER,
        Facing.FRONT,
        Landmark.WAIST,
    )
    assert _summary("circle-skirt", "back")[2] is Facing.BACK
    band = _placement("circle-skirt", "waistband-front")
    assert band.anchor[1] == 0.0  # le bas de la ceinture est posé sur la taille
    assert _placement("circle-skirt", "waistband-back").facing is Facing.BACK


def test_circle_skirt_anchor_is_the_middle_of_the_waist_arc() -> None:
    pattern = _pattern("circle-skirt")
    front = pattern.panel("front")
    assert front.placement is not None
    assert front.placement.anchor[1] == pytest.approx(650.0)  # longueur radiale


def test_trousers_legs_are_placed_front_and_back_at_the_waist() -> None:
    expected = {
        "front-left": (BodySide.LEFT, Facing.FRONT),
        "front-right": (BodySide.RIGHT, Facing.FRONT),
        "back-left": (BodySide.LEFT, Facing.BACK),
        "back-right": (BodySide.RIGHT, Facing.BACK),
    }
    for panel_id, (side, facing) in expected.items():
        zone, body_side, face, landmark = _summary("trousers", panel_id)
        assert (zone, body_side, face, landmark) == (Zone.LEG, side, facing, Landmark.WAIST)


def test_trousers_anchor_is_the_middle_of_the_waist_on_the_rise() -> None:
    pattern = _pattern("trousers")
    for panel in pattern.panels:
        assert panel.placement is not None
        rise = panel.edge("rise")
        assert panel.placement.anchor in (rise.start, rise.end)
        assert panel.placement.anchor[1] == 1000.0  # longueur du pantalon : haut de la taille


def test_bodice_pieces_are_anchored_at_the_waist_on_the_middle_line() -> None:
    assert _summary("bodice", "front") == (
        Zone.TORSO,
        BodySide.CENTER,
        Facing.FRONT,
        Landmark.WAIST,
    )
    assert _summary("bodice", "back-right")[1:3] == (BodySide.RIGHT, Facing.BACK)
    assert _summary("bodice", "back-left")[1:3] == (BodySide.LEFT, Facing.BACK)
    assert _placement("bodice", "front").anchor == (0.0, 0.0)


def test_sleeve_is_wrapped_around_the_arm_from_the_top_of_the_cap() -> None:
    assert _summary("bodice-with-sleeves", "sleeve") == (
        Zone.ARM,
        BodySide.RIGHT,
        Facing.OUTER,
        Landmark.SHOULDER,
    )
    pattern = _pattern("bodice-with-sleeves")
    assert pattern.panel("sleeve").quantity == 2
    assert _placement("bodice-with-sleeves", "sleeve").anchor == (0.0, 600.0)


def test_a_mirrored_panel_is_placed_on_the_other_side() -> None:
    panel = _pattern("trousers").panel("front-left")
    mirrored = mirror_panel(panel, "other", "Autre")
    assert panel.placement is not None and mirrored.placement is not None
    assert mirrored.placement.body_side is BodySide.RIGHT
    assert mirrored.placement.anchor == mirrored.edge("rise").end
    assert mirrored.placement.facing is panel.placement.facing


@pytest.mark.parametrize("case", CASES)
def test_the_spec_carries_the_placement_of_each_panel(case: str) -> None:
    pattern = _pattern(case)
    spec = to_spec(pattern)
    for core, panel in zip(pattern.panels, spec.panels, strict=True):
        assert core.placement is not None and panel.placement is not None
        assert panel.placement.zone.value == core.placement.zone.value
        assert panel.placement.bodySide.value == core.placement.body_side.value
        assert panel.placement.facing.value == core.placement.facing.value
        assert panel.placement.anchor.landmark.value == core.placement.landmark.value
        assert panel.placement.anchor.point.root == list(core.placement.anchor)
        assert panel.placement.clearanceMm == 30.0

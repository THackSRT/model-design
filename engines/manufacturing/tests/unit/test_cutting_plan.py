"""Plan de coupe : pièces à placer, rotation, pliure, largeur utile, efficience."""

import math
from dataclasses import replace

import pytest

from manufacturing.core.cutting_plan import (
    Fabric,
    GarmentToCut,
    Layout,
    PlacedPiece,
    compute_cutting_plan,
)
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.geometry import signed_area
from manufacturing.core.model import FinishingSettings, Panel, Point
from tests.builders import a_pattern, fold_rectangle, grain_rectangle

SETTINGS = FinishingSettings()
FOLDED = Fabric(1400)
SINGLE = Fabric(1400, Layout.SINGLE)


def _plan(*panels: Panel, fabric: Fabric = FOLDED, count: int = 1, spacing: float = 5):  # type: ignore[no-untyped-def]
    garment = GarmentToCut("38", a_pattern(*panels), count)
    return compute_cutting_plan((garment,), fabric, SETTINGS, spacing)


def _y_range(placed: PlacedPiece) -> tuple[float, float]:
    ys = [p[1] for p in placed.outline]
    return min(ys), max(ys)


def test_folded_regular_piece_gives_pairs_and_a_surplus() -> None:
    plan = _plan(grain_rectangle(100, 200, quantity=3))
    assert [(p.plies, p.on_fold, p.mirrored) for p in plan.placements] == [(2, False, False)] * 2
    assert plan.surplus_piece_count == 1
    assert plan.piece_count == 4


def test_folded_fold_piece_is_one_placement_per_quantity_on_y_zero() -> None:
    plan = _plan(fold_rectangle(100, 200, quantity=2))
    assert [(p.plies, p.on_fold) for p in plan.placements] == [(1, True)] * 2
    assert plan.surplus_piece_count == 0
    assert plan.piece_count == 2
    for placed in plan.placements:
        assert _y_range(placed)[0] == 0


def test_fold_piece_on_the_negative_side_is_flipped_to_positive_y() -> None:
    # Droit fil vertical : la rotation de -90° envoie la pièce du côté des y négatifs.
    plan = _plan(fold_rectangle(100, 200))
    low, high = _y_range(plan.placements[0])
    assert low == 0
    assert high == pytest.approx(110)  # largeur de la pièce, valeur de couture comprise
    assert plan.placements[0].rotation_deg == 270


def test_single_regular_piece_is_mirrored_one_copy_in_two() -> None:
    plan = _plan(grain_rectangle(100, 200, quantity=3), fabric=SINGLE)
    assert [(p.copy, p.plies, p.mirrored) for p in plan.placements] == [
        (1, 1, False),
        (2, 1, True),
        (3, 1, False),
    ]
    assert plan.surplus_piece_count == 0


def test_single_fold_piece_is_unfolded_into_one_polygon() -> None:
    folded = _plan(fold_rectangle(100, 200))
    plan = _plan(fold_rectangle(100, 200), fabric=SINGLE)
    placed = plan.placements[0]
    assert (placed.plies, placed.on_fold, placed.mirrored) == (1, False, False)
    half_area = abs(signed_area(folded.placements[0].outline))
    assert abs(signed_area(placed.outline)) == pytest.approx(2 * half_area, abs=1)
    assert _y_range(placed)[1] == pytest.approx(2 * 110, abs=0.02)


def _grain(angle_deg: float) -> tuple[Point, Point]:
    angle = math.radians(angle_deg)
    return (0.0, 0.0), (500 * math.cos(angle), 500 * math.sin(angle))


@pytest.mark.parametrize(
    ("grain_deg", "expected"), [(0, 0.0), (30, 330.0), (120, 240.0), (180, 180.0), (-90, 90.0)]
)
def test_rotation_brings_the_grainline_on_x_and_is_in_zero_to_360(
    grain_deg: float, expected: float
) -> None:
    plan = _plan(grain_rectangle(100, 50, grain=_grain(grain_deg)))
    assert plan.placements[0].rotation_deg == expected


def test_fold_not_parallel_to_the_grain_is_refused() -> None:
    panel = replace(fold_rectangle(100, 200), grainline=((0.0, 100.0), (100.0, 100.0)))
    with pytest.raises(ManufacturingError) as error:
        _plan(panel)
    assert error.value.kind == "fold-not-on-grain"


def test_fold_not_on_grain_is_accepted_on_a_flat_fabric() -> None:
    panel = replace(fold_rectangle(100, 200), grainline=((0.0, 100.0), (100.0, 100.0)))
    assert len(_plan(panel, fabric=SINGLE).placements) == 1


def test_usable_width() -> None:
    assert _plan(grain_rectangle(100, 50)).usable_width_mm == 690
    assert _plan(grain_rectangle(100, 50), fabric=SINGLE).usable_width_mm == 1380
    assert (
        _plan(grain_rectangle(100, 50), fabric=Fabric(1400, selvedge_margin_mm=0)).usable_width_mm
        == 700
    )


def test_piece_wider_than_the_usable_width_is_refused() -> None:
    with pytest.raises(ManufacturingError) as error:
        _plan(grain_rectangle(100, 700))  # 720 mm en y pour 690 utiles
    assert error.value.kind == "piece-wider-than-fabric"


def test_more_than_500_placements_are_refused() -> None:
    with pytest.raises(ManufacturingError) as error:
        _plan(grain_rectangle(10, 10, quantity=501), fabric=SINGLE)
    assert error.value.kind == "too-many-pieces"


def test_500_placements_are_accepted() -> None:
    plan = _plan(grain_rectangle(10, 10, quantity=500), fabric=SINGLE)
    assert len(plan.placements) == 500


def test_count_multiplies_placements_and_numbers_copies() -> None:
    plan = _plan(grain_rectangle(100, 50, quantity=2), fold_rectangle(50, 60), count=3)
    by_panel = {p.panel_id: [] for p in plan.placements}
    for p in plan.placements:
        by_panel[p.panel_id].append(p.copy)
    assert {k: sorted(v) for k, v in by_panel.items()} == {"rect": [1, 2, 3], "half": [1, 2, 3]}
    assert plan.surplus_piece_count == 0
    assert {p.garment_label for p in plan.placements} == {"38"}


def test_surplus_is_multiplied_by_count() -> None:
    assert _plan(grain_rectangle(100, 50, quantity=3), count=4).surplus_piece_count == 4


def test_efficiency_length_and_piece_count() -> None:
    plan = _plan(grain_rectangle(100, 200, quantity=2), fabric=SINGLE)
    area = sum(abs(signed_area(p.outline)) for p in plan.placements)
    xs = [x for p in plan.placements for x, _ in p.outline]
    assert plan.fabric_length_mm == math.ceil(max(xs))
    assert plan.efficiency == round(area / (1380 * plan.fabric_length_mm), 4)
    assert plan.piece_count == 2


def test_pieces_are_ordered_longest_first() -> None:
    plan = _plan(
        grain_rectangle(100, 50, "small"), grain_rectangle(300, 50, "large"), fabric=SINGLE
    )
    assert [p.panel_id for p in plan.placements] == ["large", "small"]


def test_same_request_gives_the_same_plan() -> None:
    panels = (grain_rectangle(100, 50, "a", quantity=3), fold_rectangle(70, 90, "b", quantity=2))
    assert _plan(*panels) == _plan(*panels)


def test_a_piece_with_vertical_grain_is_turned_a_quarter() -> None:
    panel = grain_rectangle(100, 50, grain=((50.0, 0.0), (50.0, 50.0)))
    plan = _plan(panel, fabric=SINGLE)
    xs = [p[0] for p in plan.placements[0].outline]
    ys = [p[1] for p in plan.placements[0].outline]
    assert (max(xs), max(ys)) == (70, 120)  # 50 + 20 en x, 100 + 20 en y

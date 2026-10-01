"""Invariants du plan de coupe sur des rectangles et sur les pièces de la fixture jupe."""

from dataclasses import replace

from hypothesis import given, settings
from hypothesis import strategies as st

from manufacturing.core.cutting_plan import (
    CuttingPlan,
    Direction,
    Fabric,
    GarmentToCut,
    Layout,
    compute_cutting_plan,
)
from manufacturing.core.model import FinishingSettings, Panel, Pattern
from manufacturing.core.nesting import Box, nest
from tests.builders import a_pattern, fold_rectangle, grain_rectangle, skirt_pattern

TOLERANCE = 0.01 + 1e-6


def _boxes(plan: CuttingPlan) -> list[tuple[float, float, float, float]]:
    out = []
    for placed in plan.placements:
        xs, ys = [p[0] for p in placed.outline], [p[1] for p in placed.outline]
        out.append((min(xs), min(ys), max(xs), max(ys)))
    return out


def _check_plan(plan: CuttingPlan, spacing: float, expected_pieces: int) -> None:
    boxes = _boxes(plan)
    for i, a in enumerate(boxes):
        assert a[0] >= 0 and a[1] >= 0
        assert a[2] <= plan.fabric_length_mm and a[3] <= plan.usable_width_mm + 0.01
        for b in boxes[i + 1 :]:
            gap_x = max(a[0] - b[2], b[0] - a[2])
            gap_y = max(a[1] - b[3], b[1] - a[3])
            assert max(gap_x, gap_y) >= spacing - TOLERANCE
    for placed, box in zip(plan.placements, boxes, strict=True):
        assert not placed.on_fold or box[1] == 0
    assert 0 < plan.efficiency <= 1
    assert plan.piece_count == expected_pieces + plan.surplus_piece_count


def _run(pattern: Pattern, fabric: Fabric, count: int, spacing: int) -> CuttingPlan:
    garment = GarmentToCut("38", pattern, count)
    return compute_cutting_plan((garment,), fabric, FinishingSettings(), spacing)


fabrics = st.builds(
    Fabric,
    st.integers(900, 1800).map(float),
    st.sampled_from(Layout),
    st.sampled_from(Direction),
    st.integers(0, 30).map(float),
)


@settings(max_examples=60, deadline=None)
@given(
    st.lists(
        st.tuples(st.integers(40, 300), st.integers(40, 300), st.integers(1, 4)),
        min_size=1,
        max_size=6,
    ),
    fabrics,
    st.integers(1, 3),
    st.integers(0, 50),
)
def test_rectangles_never_overlap_and_stay_in_the_fabric(
    sizes: list[tuple[int, int, int]], fabric: Fabric, count: int, spacing: int
) -> None:
    panels: list[Panel] = []
    for i, (w, h, q) in enumerate(sizes):
        maker = fold_rectangle if i % 3 == 2 else grain_rectangle
        panels.append(maker(w, h, f"p{i}", quantity=q))
    plan = _run(a_pattern(*panels), fabric, count, spacing)
    _check_plan(plan, spacing, count * sum(q for _, _, q in sizes))


@settings(max_examples=60, deadline=None)
@given(
    st.lists(st.integers(1, 4), min_size=2, max_size=2),
    fabrics,
    st.integers(1, 3),
    st.integers(0, 50),
)
def test_skirt_pieces_respect_the_invariants_and_are_deterministic(
    quantities: list[int], fabric: Fabric, count: int, spacing: int
) -> None:
    base = skirt_pattern()
    panels = tuple(replace(p, quantity=q) for p, q in zip(base.panels, quantities, strict=True))
    pattern = replace(base, panels=panels)
    plan = _run(pattern, fabric, count, spacing)
    _check_plan(plan, spacing, count * sum(quantities))
    assert plan == _run(pattern, fabric, count, spacing)


@settings(max_examples=100, deadline=None)
@given(
    st.lists(
        st.tuples(st.integers(10, 300), st.integers(10, 200), st.booleans()),
        min_size=1,
        max_size=30,
    ),
    st.integers(0, 40),
)
def test_nesting_keeps_the_spacing_between_boxes(
    sizes: list[tuple[int, int, bool]], spacing: int
) -> None:
    boxes = [Box(float(w), float(h), edge) for w, h, edge in sizes]
    positions = nest(boxes, 400.0, float(spacing))
    for i, ((xa, ya), a) in enumerate(zip(positions, boxes, strict=True)):
        assert xa >= 0 and ya >= 0 and ya + a.width_mm <= 400 + 1e-6
        assert not a.at_edge or ya == 0
        for (xb, yb), b in zip(positions[i + 1 :], boxes[i + 1 :], strict=True):
            gap_x = max(xa - (xb + b.length_mm), xb - (xa + a.length_mm))
            gap_y = max(ya - (yb + b.width_mm), yb - (ya + a.width_mm))
            assert max(gap_x, gap_y) >= spacing - 1e-6

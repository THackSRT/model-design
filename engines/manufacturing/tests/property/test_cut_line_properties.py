"""Invariants de la ligne de coupe sur des polygones convexes tirés au hasard."""

import math

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from manufacturing.core.allowances import cut_outline
from manufacturing.core.geometry import distance, is_simple, point_in_polygon, signed_area
from manufacturing.core.model import AllowancePolicy, Panel, Point
from tests.builders import polygon_panel


@st.composite
def convex_panels(draw: st.DrawFn) -> tuple[Panel, list[float]]:
    n = draw(st.integers(3, 8))
    radius = draw(st.floats(200, 400))
    weights = draw(st.lists(st.floats(0.5, 2.0), min_size=n, max_size=n))
    gaps = [w * 2 * math.pi / sum(weights) for w in weights]
    assume(all(0.3 <= g <= 2.8 for g in gaps))
    angles = [sum(gaps[:i]) for i in range(n)]
    points: list[Point] = [(radius * math.cos(a), radius * math.sin(a)) for a in angles]
    sides = [distance(points[i], points[(i + 1) % n]) for i in range(n)]
    assume(all(20 <= s <= 800 for s in sides))
    values = draw(st.lists(st.floats(0, 50), min_size=n, max_size=n))
    return polygon_panel(points), values


def _policy(panel: Panel, values: list[float]) -> AllowancePolicy:
    return AllowancePolicy(
        by_edge={(panel.id, e.id): v for e, v in zip(panel.edges, values, strict=True)}
    )


@settings(max_examples=200, deadline=None)
@given(convex_panels())
def test_cut_line_is_simple_and_contains_the_seam_line(case: tuple[Panel, list[float]]) -> None:
    panel, values = case
    outline = cut_outline(panel, _policy(panel, values))
    assert is_simple(list(outline.cut_line))
    assert all(point_in_polygon(p, list(outline.cut_line), 0.02) for p in outline.seam_line)


@settings(max_examples=200, deadline=None)
@given(convex_panels())
def test_straight_edge_offset_distance_equals_its_allowance(
    case: tuple[Panel, list[float]],
) -> None:
    panel, values = case
    cut = list(cut_outline(panel, _policy(panel, values)).cut_line)
    for edge, value in zip(panel.edges, values, strict=True):
        dx, dy = edge.end[0] - edge.start[0], edge.end[1] - edge.start[1]
        length = math.hypot(dx, dy)
        # Le point de coupe le plus proche de la droite du bord, côté extérieur, est à `value`.
        gaps = [
            abs(dx * (p[1] - edge.start[1]) - dy * (p[0] - edge.start[0])) / length for p in cut
        ]
        assert any(abs(g - value) <= 0.01 for g in gaps)


@settings(max_examples=200, deadline=None)
@given(convex_panels())
def test_cut_area_is_at_least_the_seam_area(case: tuple[Panel, list[float]]) -> None:
    panel, values = case
    outline = cut_outline(panel, _policy(panel, values))
    assert signed_area(outline.cut_line) >= signed_area(outline.seam_line) - 0.01


@settings(max_examples=100, deadline=None)
@given(convex_panels())
def test_zero_allowances_give_the_seam_line(case: tuple[Panel, list[float]]) -> None:
    panel, values = case
    outline = cut_outline(panel, _policy(panel, [0.0] * len(values)))
    assert len(outline.cut_line) == len(outline.seam_line)
    for a, b in zip(outline.cut_line, outline.seam_line, strict=True):
        assert distance(a, b) <= 0.02

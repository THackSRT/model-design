import math

import pytest

from patterning.core.curves import (
    arc_cubics,
    point_at_length,
    quadratic_from_tangents,
    split_edge_at_length,
)
from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length, sample_edge
from patterning.core.model import Edge, EdgeRole


def test_quadratic_respects_both_tangents() -> None:
    p0, d0, p1, d1 = (0.0, 0.0), (1.0, 0.5), (100.0, 60.0), (0.2, 1.0)
    (c,) = quadratic_from_tangents(p0, d0, p1, d1)
    start = (c[0] - p0[0], c[1] - p0[1])
    end = (p1[0] - c[0], p1[1] - c[1])
    for tangent, wanted in ((start, d0), (end, d1)):
        cross = tangent[0] * wanted[1] - tangent[1] * wanted[0]
        assert abs(cross) / math.hypot(*tangent) / math.hypot(*wanted) < 1e-9
        assert tangent[0] * wanted[0] + tangent[1] * wanted[1] > 0


def test_parallel_tangents_are_refused() -> None:
    with pytest.raises(DraftingError) as error:
        quadratic_from_tangents((0.0, 0.0), (1.0, 0.0), (10.0, 5.0), (1.0, 0.0))
    assert error.value.kind == "curve-tangents-parallel"


def test_half_circle_is_cubics_within_a_hundredth_of_a_millimetre() -> None:
    cubics = arc_cubics((0.0, 0.0), 1000.0, 0.0, 180.0)
    assert len(cubics) == 4
    worst = 0.0
    for p0, c1, c2, p3 in cubics:
        edge = Edge("arc", p0, p3, EdgeRole.SEAM, (c1, c2))
        for x, y in sample_edge(edge, 200):
            worst = max(worst, abs(math.hypot(x, y) - 1000.0))
    assert worst < 0.01


def test_arc_sweeps_are_signed() -> None:
    cubics = arc_cubics((0.0, 0.0), 100.0, 90.0, -90.0)
    assert len(cubics) == 2
    assert cubics[0][0] == pytest.approx((0.0, 100.0), abs=1e-9)
    assert cubics[-1][3] == pytest.approx((100.0, 0.0), abs=1e-9)


def _curved() -> Edge:
    return Edge("e", (0.0, 0.0), (300.0, 0.0), EdgeRole.SEAM, ((100.0, 60.0), (200.0, -40.0)))


def test_split_keeps_the_total_length() -> None:
    edge = _curved()
    left, right = split_edge_at_length(edge, 120.0, ("l", "r"))
    assert edge_length(left) == pytest.approx(120.0, abs=0.01)
    assert edge_length(left) + edge_length(right) == pytest.approx(edge_length(edge), abs=0.01)
    assert left.end == right.start
    assert (left.id, right.id) == ("l", "r")


def test_split_of_a_straight_edge_and_point_at_length() -> None:
    edge = Edge("e", (0.0, 0.0), (100.0, 0.0), EdgeRole.HEM)
    left, right = split_edge_at_length(edge, 30.0, ("a", "b"))
    assert left.end == (30.0, 0.0)
    assert right.role is EdgeRole.HEM
    assert point_at_length(edge, 70.0) == (70.0, 0.0)


def test_point_at_length_is_the_split_point() -> None:
    edge = _curved()
    left, _ = split_edge_at_length(edge, 150.0, ("a", "b"))
    assert point_at_length(edge, 150.0) == pytest.approx(left.end)


def test_length_beyond_the_edge_is_refused() -> None:
    with pytest.raises(ValueError, match="hors du bord"):
        point_at_length(_curved(), 10_000.0)

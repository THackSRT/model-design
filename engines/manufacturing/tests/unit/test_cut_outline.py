"""Aplatissement, valeurs de couture et ligne de coupe."""

import pytest

from manufacturing.core.allowances import compute_cut_outlines, cut_outline, resolve_allowances
from manufacturing.core.errors import ManufacturingError
from manufacturing.core.geometry import flatten_edge, flatten_panel, signed_area
from manufacturing.core.model import AllowancePolicy, Edge, EdgeRole, Panel
from tests.builders import a_pattern, polygon_panel, rectangle, skirt_pattern

NO_HEM = AllowancePolicy(default_mm=10)


def test_straight_edge_has_two_points_and_curve_has_65() -> None:
    assert flatten_edge(Edge("s", (0, 0), (10, 0))) == [(0, 0), (10, 0)]
    curve = Edge("c", (0, 0), (100, 0), controls=((50, 50),))
    flat = flatten_edge(curve)
    assert len(flat) == 65
    assert flat[0] == (0, 0)
    assert flat[-1] == (100, 0)
    cubic = Edge("c", (0, 0), (100, 0), controls=((0, 50), (100, 50)))
    assert len(flatten_edge(cubic)) == 65


def test_open_contour_is_rejected() -> None:
    panel = polygon_panel([(0, 0), (100, 0), (100, 100), (0, 100)], "open")
    edges = (*panel.edges[:-1], Edge("e3", (0, 100), (0, 0.5)))
    with pytest.raises(ManufacturingError) as error:
        flatten_panel(Panel("open", "open", edges))
    assert error.value.kind == "open-contour"
    assert "open" in error.value.detail


def test_rectangle_cut_line_is_120_by_220() -> None:
    outline = cut_outline(rectangle(100, 200), NO_HEM)
    assert set(outline.cut_line) == {(-10, -10), (110, -10), (110, 210), (-10, 210)}
    assert len(outline.cut_line) == 4
    assert signed_area(outline.cut_line) == 120 * 220


def test_clockwise_contour_gives_the_same_counterclockwise_cut_line() -> None:
    ccw = cut_outline(rectangle(100, 200), NO_HEM)
    cw_panel = polygon_panel([(0, 0), (0, 200), (100, 200), (100, 0)], "rect")
    cw = cut_outline(cw_panel, NO_HEM)
    assert signed_area(cw.cut_line) > 0
    assert set(cw.cut_line) == set(ccw.cut_line)


def test_skirt_default_policy_hem_fold_and_side() -> None:
    outlines = compute_cut_outlines(skirt_pattern())
    front = outlines[0]
    by_id = {e.edge_id: e for e in front.seam_edges}
    assert by_id["fold"].allowance_mm == 0
    assert by_id["hem"].allowance_mm == 30
    xs_min = min(x for x, _ in front.cut_line)
    assert xs_min == 0  # le pli reste sur x = 0
    assert min(y for _, y in front.cut_line) == -30
    assert max(x for x, _ in front.cut_line) == 260


def test_resolution_priority_edge_then_role_then_default() -> None:
    panel = polygon_panel(
        [(0, 0), (100, 0), (100, 100), (0, 100)],
        "p",
        [EdgeRole.HEM, EdgeRole.SEAM, EdgeRole.WAISTLINE, EdgeRole.FOLD],
    )
    policy = AllowancePolicy(
        default_mm=7, by_role={EdgeRole.HEM: 25, EdgeRole.FOLD: 9}, by_edge={("p", "e0"): 12}
    )
    assert resolve_allowances(panel, policy) == (12, 7, 7, 0)
    assert (
        resolve_allowances(panel, AllowancePolicy(default_mm=7, by_role={EdgeRole.HEM: 25}))[0]
        == 25
    )


def test_by_edge_on_unknown_panel_or_edge_is_rejected() -> None:
    pattern = a_pattern(rectangle(100, 100, "p"))
    for key in (("nope", "e0"), ("p", "nope")):
        with pytest.raises(ManufacturingError) as error:
            compute_cut_outlines(pattern, AllowancePolicy(by_edge={key: 5}))
        assert error.value.kind == "unknown-edge"


def test_by_edge_on_fold_is_rejected_but_zero_is_accepted() -> None:
    panel = polygon_panel(
        [(0, 0), (100, 0), (100, 100), (0, 100)], "p", [EdgeRole.SEAM] * 3 + [EdgeRole.FOLD]
    )
    with pytest.raises(ManufacturingError) as error:
        compute_cut_outlines(a_pattern(panel), AllowancePolicy(by_edge={("p", "e3"): 5}))
    assert error.value.kind == "allowance-on-fold"
    compute_cut_outlines(a_pattern(panel), AllowancePolicy(by_edge={("p", "e3"): 0}))


def test_tighter_concave_curve_loop_is_removed() -> None:
    # Bord courbe creusé vers l'intérieur, rayon de courbure plus petit que la valeur de couture.
    bottom = Edge("b", (0, 0), (100, 0), controls=((50, 40), (50, 40)), role=EdgeRole.SEAM)
    panel = Panel(
        "p",
        "p",
        (
            bottom,
            Edge("r", (100, 0), (100, 100)),
            Edge("t", (100, 100), (0, 100)),
            Edge("l", (0, 100), (0, 0)),
        ),
    )
    outline = cut_outline(panel, AllowancePolicy(default_mm=30))
    assert signed_area(outline.cut_line) > 0


def test_self_intersecting_cut_line_is_rejected() -> None:
    # Une fente de 4 mm : les valeurs de couture de ses deux parois se chevauchent.
    slit = [(0, 0), (100, 0), (100, 100), (52, 100), (52, 50), (48, 50), (48, 100), (0, 100)]
    panel = polygon_panel(slit, "slit")
    with pytest.raises(ManufacturingError) as error:
        cut_outline(panel, AllowancePolicy(default_mm=10))
    assert error.value.kind == "cut-line-self-intersects"
    assert "slit" in error.value.detail


def test_calculation_is_deterministic() -> None:
    pattern = skirt_pattern()
    assert compute_cut_outlines(pattern) == compute_cut_outlines(pattern)

"""Une pince insérée dans un polygone convexe ne rend pas la ligne de coupe non simple."""

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.geometry import distance, is_simple, point_in_polygon
from manufacturing.core.model import AllowancePolicy, Edge, Panel, Pattern, Point, Seam
from tests.property.test_cut_line_properties import convex_panels


def _with_dart(panel: Panel, index: int, width: float, depth: float) -> Pattern:
    edge = panel.edges[index]
    (x0, y0), (x1, y1) = edge.start, edge.end
    length = distance(edge.start, edge.end)
    ux, uy = (x1 - x0) / length, (y1 - y0) / length
    mid = (x0 + x1) / 2, (y0 + y1) / 2
    a: Point = (mid[0] - ux * width / 2, mid[1] - uy * width / 2)
    b: Point = (mid[0] + ux * width / 2, mid[1] + uy * width / 2)
    apex: Point = (mid[0] - uy * depth, mid[1] + ux * depth)  # vers l'intérieur (sens trigo)
    pieces = (
        Edge("pre", edge.start, a),
        Edge("leg-a", a, apex),
        Edge("leg-b", apex, b),
        Edge("post", b, edge.end),
    )
    edges = (*panel.edges[:index], *pieces, *panel.edges[index + 1 :])
    seams = (Seam("dart", (panel.id, "leg-a"), (panel.id, "leg-b")),)
    return Pattern("t", (Panel(panel.id, panel.name, edges),), seams)


def test_bridge_over_non_aligned_neighbours_with_10_and_30_mm() -> None:
    # Bord haut incliné de part et d'autre de la pince, valeurs de couture 10 et 30 mm.
    points: list[Point] = [
        (0, 0),
        (300, 0),
        (300, 200),
        (170, 230),
        (150, 170),
        (130, 230),
        (0, 180),
    ]
    edges = tuple(Edge(f"e{i}", p, points[(i + 1) % len(points)]) for i, p in enumerate(points))
    pattern = Pattern("t", (Panel("p", "p", edges),), (Seam("dart", ("p", "e3"), ("p", "e4")),))
    policy = AllowancePolicy(default_mm=10, by_edge={("p", "e2"): 30})
    piece = compute_cut_pieces(pattern, policy)[0]
    cut = list(piece.outline.cut_line)
    assert is_simple(cut)
    assert all(point_in_polygon(p, cut, 0.02) for p in piece.outline.seam_line)
    assert all(not (130 < x < 170) or y > 230 for x, y in cut)


@settings(max_examples=100, deadline=None)
@given(convex_panels(), st.floats(10, 30), st.floats(30, 80))
def test_cut_line_with_a_dart_is_simple_and_bridges_it(
    case: tuple[Panel, list[float]], width: float, depth: float
) -> None:
    panel, _ = case
    lengths = [distance(e.start, e.end) for e in panel.edges]
    index = max(range(len(lengths)), key=lambda i: lengths[i])
    assume(lengths[index] >= 200)
    pattern = _with_dart(panel, index, width, depth)
    piece = compute_cut_pieces(pattern, AllowancePolicy(default_mm=10))[0]
    cut = list(piece.outline.cut_line)
    assert is_simple(cut)
    assert all(point_in_polygon(p, cut, 0.02) for p in piece.outline.seam_line)
    assert {n.edge_id for n in piece.notches} >= {"pre", "post"}

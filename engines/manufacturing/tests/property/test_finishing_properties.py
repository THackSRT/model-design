"""Invariants de la finition sur des polygones convexes tirés au hasard."""

from hypothesis import given, settings

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.geometry import distance, point_in_polygon
from manufacturing.core.model import AllowancePolicy, NotchPlacement, NotchRequest, Panel
from tests.builders import a_pattern
from tests.property.test_cut_line_properties import convex_panels

POLICY = AllowancePolicy(default_mm=10)


@settings(max_examples=100, deadline=None)
@given(convex_panels())
def test_pieces_are_consistent(case: tuple[Panel, list[float]]) -> None:
    panel, _ = case
    request = NotchRequest(panel.id, NotchPlacement("e0", 5, 2))
    piece = compute_cut_pieces(a_pattern(panel), POLICY, (request,))[0]
    seam, cut = list(piece.outline.seam_line), list(piece.outline.cut_line)
    (x0, y0), (x1, y1) = piece.bounds
    assert all(x0 <= x <= x1 and y0 <= y <= y1 for x, y in cut)
    assert point_in_polygon(piece.label_anchor, seam, 0.02)
    assert piece.cut_area_mm2 > 0
    mark = piece.notches[0]
    assert point_in_polygon(mark.position, cut, 0.02)
    assert len(mark.segments) == 2
    for start, end in mark.segments:
        assert point_in_polygon(start, cut, 0.02) and point_in_polygon(end, cut, 0.02)
        assert distance(start, end) <= 6.02

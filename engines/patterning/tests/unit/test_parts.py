import pytest

from patterning.core.checks import check_pattern
from patterning.core.garments.parts import mirror_panel, notch_at_middle
from patterning.core.geometry import edge_length
from patterning.core.model import Edge, EdgeRole, Notch, Panel, Pattern


def _edge(edge_id: str, a: tuple[float, float], b: tuple[float, float]) -> Edge:
    return Edge(edge_id, a, b, EdgeRole.SEAM)


def _trapezoid() -> Panel:
    edges = (
        _edge("bottom", (0.0, 0.0), (100.0, 0.0)),
        _edge("right", (100.0, 0.0), (60.0, 80.0)),
        _edge("top", (60.0, 80.0), (0.0, 80.0)),
        _edge("left", (0.0, 80.0), (0.0, 0.0)),
    )
    return Panel("p", "P", edges, ((10.0, 10.0), (10.0, 70.0)), notches=(Notch("right", 20.0),))


def test_mirror_keeps_a_closed_counterclockwise_contour() -> None:
    mirrored = mirror_panel(_trapezoid(), "q", "Q")
    check_pattern(Pattern("t", (mirrored,)))
    assert mirrored.id == "q"
    assert min(p[0] for e in mirrored.edges for p in (e.start, e.end)) == 0.0


def test_mirror_measures_notches_from_the_other_end_of_the_edge() -> None:
    original = _trapezoid()
    mirrored = mirror_panel(original, "q", "Q")
    length = edge_length(original.edge("right"))
    assert mirrored.notches[0].distance_mm == pytest.approx(length - 20, abs=0.01)
    assert edge_length(mirrored.edge("right")) == pytest.approx(length, abs=0.01)


def test_notch_in_the_middle_of_several_edges() -> None:
    edges = [_edge("a", (0.0, 0.0), (10.0, 0.0)), _edge("b", (10.0, 0.0), (40.0, 0.0))]
    notch = notch_at_middle(edges)
    assert (notch.edge_id, notch.distance_mm) == ("b", 10.0)

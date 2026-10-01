from dataclasses import replace

import pytest

from patterning.core.checks import check_pattern
from patterning.core.errors import PatternCheckError
from patterning.core.model import Edge, EdgeRole, Notch, Panel, Pattern, Seam


def _rect(panel_id: str, width: float, height: float = 100.0) -> Panel:
    corners = [(0.0, 0.0), (width, 0.0), (width, height), (0.0, height)]
    edges = tuple(Edge(f"e{i}", corners[i], corners[(i + 1) % 4], EdgeRole.SEAM) for i in range(4))
    return Panel(panel_id, panel_id, edges, ((1.0, 1.0), (1.0, 50.0)))


def _pattern(*panels: Panel, seams: tuple[Seam, ...] = ()) -> Pattern:
    return Pattern("test", panels, seams)


def test_accepts_a_closed_counterclockwise_pattern() -> None:
    check_pattern(_pattern(_rect("a", 100)))


def test_refuses_an_open_contour() -> None:
    panel = _rect("a", 100)
    broken = replace(panel.edges[1], end=(100.0, 120.0))
    with pytest.raises(PatternCheckError, match="ne rejoint pas"):
        check_pattern(_pattern(replace(panel, edges=(panel.edges[0], broken, *panel.edges[2:]))))


def test_refuses_a_clockwise_contour() -> None:
    panel = _rect("a", 100)
    reversed_edges = tuple(Edge(e.id, e.end, e.start, e.role) for e in reversed(panel.edges))
    with pytest.raises(PatternCheckError, match="sens trigonométrique"):
        check_pattern(_pattern(replace(panel, edges=reversed_edges)))


def test_refuses_a_seam_with_unequal_lengths() -> None:
    seam = Seam("s", ("a", "e1"), ("b", "e1"))
    with pytest.raises(PatternCheckError, match="Couture s"):
        check_pattern(_pattern(_rect("a", 100, 120), _rect("b", 100), seams=(seam,)))


def test_accepts_a_seam_matching_its_ease() -> None:
    seam = Seam("s", ("a", "e1"), ("b", "e1"), ease_mm=15)
    check_pattern(_pattern(_rect("a", 100, 115.3), _rect("b", 100), seams=(seam,)))


def test_refuses_a_seam_missing_its_ease() -> None:
    seam = Seam("s", ("a", "e1"), ("b", "e1"), ease_mm=15)
    with pytest.raises(PatternCheckError):
        check_pattern(_pattern(_rect("a", 100, 116), _rect("b", 100), seams=(seam,)))


def test_refuses_a_notch_beyond_its_edge() -> None:
    panel = replace(_rect("a", 100), notches=(Notch("e0", 150.0),))
    with pytest.raises(PatternCheckError, match="cran"):
        check_pattern(_pattern(panel))


def test_accepts_a_notch_on_its_edge() -> None:
    check_pattern(_pattern(replace(_rect("a", 100), notches=(Notch("e0", 40.0, 2),))))

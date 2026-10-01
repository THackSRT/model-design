import math

import pytest

from patterning.core.drafting import draft
from patterning.core.geometry import edge_length
from patterning.core.model import EdgeRole, Panel, Pattern
from tests.builders import reference_measurements

WAIST_WITH_EASE = 640 + 10


def _skirt(**params: float) -> Pattern:
    return draft("circle-skirt", reference_measurements(), {"length_mm": 650, **params})


def _arc(panel: Panel, prefix: str) -> float:
    return sum(edge_length(e) for e in panel.edges if e.id.startswith(prefix))


@pytest.mark.parametrize("fraction", [1.0, 0.5, 0.25])
def test_waist_arc_of_front_and_back_is_waist_girth_plus_ease(fraction: float) -> None:
    pattern = _skirt(circle_fraction=fraction)
    total = _arc(pattern.panel("front"), "waist-") + _arc(pattern.panel("back"), "waist-")
    assert total == pytest.approx(WAIST_WITH_EASE, abs=0.5)


def test_hem_arc_follows_the_circle_fraction() -> None:
    pattern = _skirt(circle_fraction=0.5)
    radius = WAIST_WITH_EASE / (2 * math.pi * 0.5) + 650
    assert _arc(pattern.panel("front"), "hem-") == pytest.approx(math.pi * 0.5 * radius, abs=0.5)


def test_radial_length_is_the_requested_length() -> None:
    for panel in _skirt().panels:
        for side in ("side-right", "side-left"):
            assert edge_length(panel.edge(side)) == pytest.approx(650, abs=0.5)


def test_without_a_waistband_the_waist_is_the_waistline_and_pieces_are_front_and_back() -> None:
    pattern = _skirt()
    assert [p.id for p in pattern.panels] == ["front", "back"]
    waist = [e for e in pattern.panel("front").edges if e.id.startswith("waist-")]
    assert all(e.role is EdgeRole.WAISTLINE for e in waist)


def test_waistband_bottom_equals_the_skirt_waist() -> None:
    pattern = _skirt(waistband_width_mm=40)
    assert [p.id for p in pattern.panels] == ["front", "back", "waistband-front", "waistband-back"]
    for side in ("front", "back"):
        band = pattern.panel(f"waistband-{side}")
        assert _arc(band, "bottom-") == pytest.approx(_arc(pattern.panel(side), "waist-"), abs=0.5)
        assert edge_length(band.edge("side-right")) == pytest.approx(40, abs=0.01)


def test_every_sewn_pair_has_the_same_length() -> None:
    pattern = _skirt(waistband_width_mm=30, circle_fraction=0.75)
    assert pattern.seams
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert edge_length(a) == pytest.approx(edge_length(b), abs=0.5)


def test_middle_of_the_waist_is_notched_on_front_and_back() -> None:
    for panel in _skirt().panels:
        assert [n.edge_id for n in panel.notches] == ["waist-2"]


def test_same_inputs_give_the_same_pattern() -> None:
    assert _skirt() == _skirt()

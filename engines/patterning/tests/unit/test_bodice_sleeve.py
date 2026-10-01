"""Manche montée : tête embue sur l'emmanchure, longueur, ourlet, dessous de bras, crans."""

import pytest

from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Pattern
from tests.builders import reference_measurements, self_crossings


def _sleeved(**params: float) -> Pattern:
    given = {"sleeve_length_mm": 600.0, **params}
    return draft("bodice", reference_measurements("bodice"), given)


def _arm(pattern: Pattern, panel: str) -> float:
    return edge_length(pattern.panel(panel).edge("armhole"))


def test_a_fourth_panel_is_the_sleeve_cut_twice() -> None:
    pattern = _sleeved()
    assert [p.id for p in pattern.panels] == ["front", "back-right", "back-left", "sleeve"]
    assert pattern.panel("sleeve").quantity == 2
    assert pattern.panel("front").edge("armhole").role == "seam"


@pytest.mark.parametrize("ease", [0, 15, 40])
def test_cap_is_longer_than_the_armhole_by_the_ease(ease: int) -> None:
    pattern = _sleeved(sleeve_cap_ease_mm=ease)
    sleeve = pattern.panel("sleeve")
    cap = edge_length(sleeve.edge("cap-front")) + edge_length(sleeve.edge("cap-back"))
    assert cap - _arm(pattern, "front") - _arm(pattern, "back-right") == pytest.approx(
        ease, abs=0.5
    )


def test_the_ease_is_declared_on_the_armhole_seams_and_shared_in_proportion() -> None:
    pattern = _sleeved(sleeve_cap_ease_mm=20)
    seams = {s.id: s for s in pattern.seams}
    front, back = seams["armhole-front"], seams["armhole-back"]
    assert front.ease_mm + back.ease_mm == pytest.approx(20, abs=1e-9)
    assert front.ease_mm == pytest.approx(10, abs=0.1)
    for seam in (front, back):
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert edge_length(a) - edge_length(b) == pytest.approx(seam.ease_mm, abs=0.5)
    assert seams["sleeve-underarm"].ease_mm == 0


def test_underarm_seam_is_exact() -> None:
    sleeve = _sleeved().panel("sleeve")
    assert edge_length(sleeve.edge("underarm-front")) == pytest.approx(
        edge_length(sleeve.edge("underarm-back")), abs=0.05
    )


def test_sleeve_length_and_hem_follow_the_request() -> None:
    for length, hem in ((350, 200), (600, 240), (800, 400)):
        sleeve = _sleeved(sleeve_length_mm=length, sleeve_hem_girth_mm=hem).panel("sleeve")
        heights = [p[1] for e in sleeve.edges for p in (e.start, e.end)]
        assert max(heights) - min(heights) == pytest.approx(length, abs=0.5)
        assert min(heights) == 0
        assert edge_length(sleeve.edge("hem")) == pytest.approx(hem, abs=0.5)
        assert sleeve.edge("hem").role == "hem"


def test_without_a_hem_girth_it_follows_the_wrist() -> None:
    sleeve = _sleeved().panel("sleeve")
    assert edge_length(sleeve.edge("hem")) == pytest.approx(0.164 * 900 + 40, abs=0.5)


def test_notches_one_in_front_two_at_the_back_one_at_the_top() -> None:
    pattern = _sleeved()
    front = [(n.distance_mm, n.count) for n in pattern.panel("front").notches]
    assert front[0][1] == 1
    assert [n.count for n in pattern.panel("back-right").notches] == [2]
    assert [n.count for n in pattern.panel("back-left").notches] == [2]
    sleeve = pattern.panel("sleeve")
    cap_front, cap_back = sleeve.edge("cap-front"), sleeve.edge("cap-back")
    fronts = sorted(n.distance_mm for n in sleeve.notches if n.edge_id == "cap-front")
    assert len(fronts) == 2  # un devant, un au sommet (bout de la demi-tête devant)
    assert fronts[1] == pytest.approx(edge_length(cap_front), abs=0.01)
    assert [n.count for n in sleeve.notches if n.edge_id == cap_back.id] == [2]


def test_notches_on_the_cap_follow_the_ease_in_proportion() -> None:
    pattern = _sleeved(sleeve_cap_ease_mm=30)
    sleeve = pattern.panel("sleeve")
    arm_front = pattern.panel("front")
    on_armhole = arm_front.notches[0].distance_mm / _arm(pattern, "front")
    cap_front = min(n.distance_mm for n in sleeve.notches if n.edge_id == "cap-front")
    assert cap_front / edge_length(sleeve.edge("cap-front")) == pytest.approx(on_armhole, abs=0.001)
    back = pattern.panel("back-right")
    on_back = back.notches[0].distance_mm / _arm(pattern, "back-right")
    cap_back = next(n.distance_mm for n in sleeve.notches if n.edge_id == "cap-back")
    assert 1 - cap_back / edge_length(sleeve.edge("cap-back")) == pytest.approx(on_back, abs=0.001)


def test_left_back_notches_are_mirrored() -> None:
    pattern = _sleeved()
    right, left = pattern.panel("back-right"), pattern.panel("back-left")
    length = edge_length(right.edge("armhole"))
    assert left.notches[0].distance_mm == pytest.approx(
        length - right.notches[0].distance_mm, abs=0.01
    )


def test_sleeve_is_a_simple_counterclockwise_contour() -> None:
    for length in (300, 600):
        sleeve = _sleeved(sleeve_length_mm=length).panel("sleeve")
        assert signed_area(sleeve.edges) > 0
        assert self_crossings(sleeve) == 0


def test_a_sleeve_shorter_than_its_cap_is_refused() -> None:
    with pytest.raises(DraftingError) as error:
        _sleeved(sleeve_length_mm=100)
    assert error.value.kind == "sleeve-shorter-than-cap"


def test_estimates_add_the_wrist_only_without_a_hem_girth() -> None:
    assert "wrist_girth_mm" in _sleeved().estimated_measurements
    assert "wrist_girth_mm" not in _sleeved(sleeve_hem_girth_mm=240).estimated_measurements

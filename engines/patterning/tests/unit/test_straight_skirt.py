import pytest

from patterning.core.errors import DraftingError
from patterning.core.geometry import edge_length
from patterning.core.straight_skirt import draft_straight_skirt
from tests.builders import a_skirt


def test_waist_of_the_four_quarters_equals_waist_girth_plus_ease() -> None:
    pattern = draft_straight_skirt(a_skirt(waist_girth_mm=700, waist_ease_mm=10))
    quarters = [edge_length(p.edge("waist")) for p in pattern.panels]
    assert sum(quarters) * 2 == pytest.approx(710, abs=0.05)


def test_hem_is_wider_by_the_requested_flare() -> None:
    plain = draft_straight_skirt(a_skirt(hem_flare_mm=0))
    flared = draft_straight_skirt(a_skirt(hem_flare_mm=80))
    widening = edge_length(flared.panel("front").edge("hem")) - edge_length(
        plain.panel("front").edge("hem")
    )
    assert widening == pytest.approx(20, abs=0.01)


def test_refuses_a_skirt_that_stops_above_the_hips() -> None:
    with pytest.raises(DraftingError) as error:
        draft_straight_skirt(a_skirt(length_mm=220))
    assert error.value.kind == "skirt-shorter-than-hip-depth"


def test_same_inputs_give_the_same_pattern() -> None:
    assert draft_straight_skirt(a_skirt()) == draft_straight_skirt(a_skirt())

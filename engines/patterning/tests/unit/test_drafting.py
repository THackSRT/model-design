import pytest

from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from tests.builders import minimal_measurements


def test_straight_skirt_is_routed_without_estimation_report() -> None:
    pattern = draft("straight-skirt", minimal_measurements(), {"length_mm": 600})
    assert pattern.garment_type == "straight-skirt"
    assert pattern.estimated_measurements == ()


def test_a_type_without_a_drafting_is_refused_with_a_stable_kind() -> None:
    with pytest.raises(DraftingError) as error:
        draft("trousers", minimal_measurements(), {"length_mm": 1000})
    assert error.value.kind == "garment-type-not-supported"

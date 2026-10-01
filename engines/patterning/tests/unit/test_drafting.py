import pytest

from patterning.core.drafting import draft
from patterning.core.errors import DraftingError
from tests.builders import full_measurements, minimal_measurements


def test_straight_skirt_reports_the_estimates_it_uses() -> None:
    pattern = draft("straight-skirt", minimal_measurements(), {"length_mm": 600})
    assert pattern.garment_type == "straight-skirt"
    assert pattern.estimated_measurements == (
        "bust_girth_mm",
        "bust_point_width_mm",
        "hip_height_mm",
        "waist_height_mm",
    )


def test_straight_skirt_reports_nothing_when_every_measurement_is_given() -> None:
    pattern = draft("straight-skirt", full_measurements(), {"length_mm": 600})
    assert pattern.estimated_measurements == ()


def test_circle_skirt_uses_no_estimate() -> None:
    pattern = draft("circle-skirt", minimal_measurements(), {"length_mm": 600})
    assert pattern.garment_type == "circle-skirt"
    assert pattern.estimated_measurements == ()


@pytest.mark.parametrize("garment_type", ["kimono"])
def test_a_type_without_a_drafting_is_refused_with_a_stable_kind(garment_type: str) -> None:
    with pytest.raises(DraftingError) as error:
        draft(garment_type, minimal_measurements(), {"length_mm": 1000})
    assert error.value.kind == "garment-type-not-supported"

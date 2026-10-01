from dataclasses import replace

import pytest

from patterning.core.body import complete_body
from patterning.core.errors import DraftingError
from tests.builders import full_measurements, minimal_measurements


def test_complete_measurements_need_no_estimation() -> None:
    _, estimated = complete_body(full_measurements())
    assert estimated == ()


def test_minimal_measurements_list_the_estimated_fields_sorted() -> None:
    _, estimated = complete_body(minimal_measurements())
    assert estimated == tuple(sorted(estimated))
    assert {"cervicale_height_mm", "arm_length_mm", "underbust_girth_mm"} <= set(estimated)
    assert "crotch_height_mm" not in estimated


def test_estimates_follow_the_ratios() -> None:
    female, _ = complete_body(minimal_measurements("female"))
    male, _ = complete_body(minimal_measurements("male"))
    assert female.head_length_mm == pytest.approx(0.154 * 1650)
    assert male.head_length_mm == pytest.approx(0.152 * 1650)
    assert female.arm_length_mm == pytest.approx(0.31 * 1650)
    assert female.underbust_girth_mm == pytest.approx(0.829 * 880)
    assert female.waist_hip_depth_mm == pytest.approx(0.136 * 1650)


def test_given_measurements_win_over_estimates() -> None:
    body, estimated = complete_body(replace(minimal_measurements(), arm_length_mm=600))
    assert body.arm_length_mm == 600
    assert "arm_length_mm" not in estimated


def test_bust_girth_falls_back_to_chest_girth() -> None:
    body, estimated = complete_body(minimal_measurements())
    assert body.bust_girth_mm == 880
    assert "bust_girth_mm" not in estimated


def test_hip_height_below_crotch_height_is_refused() -> None:
    raw = replace(full_measurements(), hip_height_mm=700, crotch_height_mm=740)
    with pytest.raises(DraftingError) as error:
        complete_body(raw)
    assert error.value.kind == "inconsistent-measurements"


def test_cervicale_above_stature_is_refused() -> None:
    with pytest.raises(DraftingError) as error:
        complete_body(replace(minimal_measurements(), cervicale_height_mm=1700))
    assert error.value.kind == "inconsistent-measurements"

from hypothesis import given, settings
from hypothesis import strategies as st

from patterning.core.body import RawMeasurements, complete_body
from patterning.core.errors import DraftingError

raw_measurements = st.builds(
    RawMeasurements,
    sex=st.sampled_from(["female", "male"]),
    stature_mm=st.integers(900, 2300),
    chest_girth_mm=st.integers(500, 1800),
    waist_girth_mm=st.integers(400, 1800),
    hip_girth_mm=st.integers(600, 1900),
    bust_girth_mm=st.none() | st.integers(600, 1800),
    cervicale_height_mm=st.none() | st.integers(700, 2000),
    back_waist_length_mm=st.none() | st.integers(300, 600),
    arm_length_mm=st.none() | st.integers(400, 900),
)


@settings(max_examples=50, deadline=None)
@given(raw_measurements)
def test_complete_body_is_deterministic_and_positive(raw: RawMeasurements) -> None:
    try:
        first = complete_body(raw)
    except DraftingError as error:
        assert error.kind == "inconsistent-measurements"
        return
    assert first == complete_body(raw)
    body, estimated = first
    assert estimated == tuple(sorted(estimated))
    numbers = [v for v in vars(body).values() if isinstance(v, float)]
    assert numbers
    assert all(v > 0 for v in numbers)

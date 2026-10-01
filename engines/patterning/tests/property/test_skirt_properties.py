"""Invariants des jupes sur des mesures tirées au hasard dans les bornes plausibles."""

from hypothesis import given, settings
from hypothesis import strategies as st

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from patterning.core.body import RawMeasurements
from patterning.core.drafting import draft
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Pattern
from patterning.spec.convert import to_spec

SETTINGS = settings(max_examples=50, deadline=None)

measurements = st.builds(
    RawMeasurements,
    sex=st.sampled_from(["female", "male"]),
    stature_mm=st.integers(1400, 2000),
    chest_girth_mm=st.integers(700, 1300),
    waist_girth_mm=st.integers(500, 1300),
    hip_girth_mm=st.integers(750, 1500),
)
straight_params = st.fixed_dictionaries(
    {
        "length_mm": st.integers(500, 1100),
        "waist_ease_mm": st.integers(0, 80),
        "hip_ease_mm": st.integers(0, 200),
        "hem_flare_mm": st.integers(0, 200),
    }
)
circle_params = st.fixed_dictionaries(
    {
        "length_mm": st.integers(300, 1300),
        "waist_ease_mm": st.integers(0, 80),
        "circle_fraction": st.floats(0.25, 1.0),
        "waistband_width_mm": st.one_of(st.just(0), st.integers(20, 80)),
    }
)
skirts = st.one_of(
    st.tuples(st.just("straight-skirt"), measurements, straight_params),
    st.tuples(st.just("circle-skirt"), measurements, circle_params),
)


def _pattern(case: tuple[str, RawMeasurements, dict[str, float]]) -> Pattern:
    garment_type, raw, params = case
    return draft(garment_type, raw, params)


@SETTINGS
@given(skirts)
def test_every_panel_is_a_closed_counterclockwise_contour(
    case: tuple[str, RawMeasurements, dict[str, float]],
) -> None:
    for panel in _pattern(case).panels:
        for current, following in zip(panel.edges, panel.edges[1:] + panel.edges[:1], strict=True):
            assert current.end == following.start
        assert signed_area(panel.edges) > 0


@SETTINGS
@given(skirts)
def test_sewn_edges_have_the_same_length(
    case: tuple[str, RawMeasurements, dict[str, float]],
) -> None:
    pattern = _pattern(case)
    assert pattern.seams
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert abs(edge_length(a) - edge_length(b) - seam.ease_mm) < 0.5


@SETTINGS
@given(skirts)
def test_output_always_matches_the_contract(
    case: tuple[str, RawMeasurements, dict[str, float]],
) -> None:
    spec = to_spec(_pattern(case))
    dumped = spec.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert GarmentSpec.model_validate(dumped) == spec
    assert spec.unit == "mm"


@SETTINGS
@given(skirts)
def test_same_input_gives_the_same_output(
    case: tuple[str, RawMeasurements, dict[str, float]],
) -> None:
    assert _pattern(case) == _pattern(case)

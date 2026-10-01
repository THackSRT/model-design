"""Invariants du pantalon sur des mesures tirées au hasard dans les bornes plausibles."""

import time

from hypothesis import given, settings
from hypothesis import strategies as st

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from patterning.core.body import RawMeasurements
from patterning.core.drafting import draft
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Pattern
from patterning.spec.convert import to_spec

SETTINGS = settings(max_examples=50, deadline=None)

type Case = tuple[RawMeasurements, dict[str, float]]


@st.composite
def cases(draw: st.DrawFn) -> Case:
    stature = draw(st.integers(1400, 2000))
    raw = RawMeasurements(
        sex=draw(st.sampled_from(["female", "male"])),
        stature_mm=stature,
        chest_girth_mm=draw(st.integers(700, 1300)),
        waist_girth_mm=draw(st.integers(500, 1300)),
        hip_girth_mm=draw(st.integers(750, 1300)),
        crotch_height_mm=int(stature * draw(st.floats(0.44, 0.49))),
    )
    params: dict[str, float] = {
        "length_mm": draw(st.integers(900, 1300)),
        "waist_ease_mm": draw(st.integers(0, 80)),
        "hip_ease_mm": draw(st.integers(20, 200)),
    }
    if draw(st.booleans()):
        params["hem_girth_mm"] = draw(st.integers(400, 900))
    return raw, params


def _pattern(case: Case) -> Pattern:
    return draft("trousers", case[0], case[1])


@SETTINGS
@given(cases())
def test_every_panel_is_a_closed_counterclockwise_contour(case: Case) -> None:
    for panel in _pattern(case).panels:
        for current, following in zip(panel.edges, panel.edges[1:] + panel.edges[:1], strict=True):
            assert current.end == following.start
        assert signed_area(panel.edges) > 0


@SETTINGS
@given(cases())
def test_sewn_edges_have_the_same_length(case: Case) -> None:
    pattern = _pattern(case)
    assert pattern.seams
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert abs(edge_length(a) - edge_length(b) - seam.ease_mm) < 0.5


@SETTINGS
@given(cases())
def test_output_always_matches_the_contract(case: Case) -> None:
    spec = to_spec(_pattern(case))
    dumped = spec.model_dump(by_alias=True, exclude_none=True, mode="json")
    assert GarmentSpec.model_validate(dumped) == spec


@SETTINGS
@given(cases())
def test_same_input_gives_the_same_output(case: Case) -> None:
    assert _pattern(case) == _pattern(case)


@SETTINGS
@given(cases())
def test_waist_and_hem_follow_the_request(case: Case) -> None:
    raw, params = case
    pattern = _pattern(case)
    waist = sum(
        edge_length(e) for p in pattern.panels for e in p.edges if e.id.startswith("waist-")
    )
    assert abs(waist - (raw.waist_girth_mm + params["waist_ease_mm"])) < 0.5
    if "hem_girth_mm" in params:
        hem = sum(edge_length(pattern.panel(f"{k}-left").edge("hem")) for k in ("front", "back"))
        assert abs(hem - params["hem_girth_mm"]) < 0.5


def test_a_trousers_pattern_is_drafted_within_the_budget() -> None:
    started = time.perf_counter()
    raw = RawMeasurements("female", 1650, 880, 640, 960, crotch_height_mm=770)
    draft("trousers", raw, {"length_mm": 1000})
    assert time.perf_counter() - started < 0.1

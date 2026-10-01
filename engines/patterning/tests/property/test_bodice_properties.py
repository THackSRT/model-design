"""Invariants du corsage sur des mesures tirées au hasard dans les bornes plausibles."""

import time

from hypothesis import given, settings
from hypothesis import strategies as st

from atelier_contracts.generated.garment_spec_schema import GarmentSpec
from patterning.core.body import RawMeasurements
from patterning.core.drafting import draft
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Pattern
from patterning.spec.convert import to_spec

SETTINGS = settings(max_examples=30, deadline=None)

type Case = tuple[RawMeasurements, dict[str, float]]


@st.composite
def cases(draw: st.DrawFn) -> Case:
    stature = draw(st.integers(1450, 1950))
    bust = draw(st.integers(750, 1250))
    raw = RawMeasurements(
        sex=draw(st.sampled_from(["female", "male"])),
        stature_mm=stature,
        chest_girth_mm=bust,
        bust_girth_mm=bust,
        waist_girth_mm=draw(st.integers(int(bust * 0.65), int(bust * 1.05))),
        hip_girth_mm=draw(st.integers(800, 1400)),
        back_waist_length_mm=int(stature * draw(st.floats(0.2, 0.235))),
    )
    params: dict[str, float] = {
        "bust_ease_mm": draw(st.integers(0, 150)),
        "waist_ease_mm": draw(st.integers(0, 150)),
        "length_below_waist_mm": draw(st.integers(0, 300)),
        "front_neck_depth_mm": draw(st.integers(0, 100)),
        "back_neck_depth_mm": draw(st.integers(0, 80)),
    }
    if draw(st.booleans()):
        params["sleeve_length_mm"] = draw(st.integers(300, 800))
        params["sleeve_cap_ease_mm"] = draw(st.integers(0, 40))
    if draw(st.booleans()):
        params["sleeve_hem_girth_mm"] = draw(st.integers(150, 500))
    return raw, params


def _pattern(case: Case) -> Pattern:
    raw, params = case
    if "sleeve_length_mm" not in params:
        params = {k: v for k, v in params.items() if not k.startswith("sleeve_")}
    return draft("bodice", raw, params)


@SETTINGS
@given(cases())
def test_every_panel_is_a_closed_counterclockwise_contour(case: Case) -> None:
    for panel in _pattern(case).panels:
        for current, following in zip(panel.edges, panel.edges[1:] + panel.edges[:1], strict=True):
            assert current.end == following.start
        assert signed_area(panel.edges) > 0


@SETTINGS
@given(cases())
def test_seams_are_exact_with_the_declared_ease(case: Case) -> None:
    pattern = _pattern(case)
    assert pattern.seams
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert abs(edge_length(a) - edge_length(b) - seam.ease_mm) < 0.5


@SETTINGS
@given(cases())
def test_waist_follows_the_request(case: Case) -> None:
    raw, params = case
    pattern = _pattern(case)
    sewn = lambda name: sum(  # noqa: E731
        edge_length(e) for e in pattern.panel(name).edges if e.id.startswith("hem-")
    )
    total = 2 * sewn("front") + sewn("back-right") + sewn("back-left")
    assert abs(total - (raw.waist_girth_mm + params["waist_ease_mm"])) < 0.5


@SETTINGS
@given(cases())
def test_cap_ease_is_the_requested_one(case: Case) -> None:
    pattern = _pattern(case)
    if not any(p.id == "sleeve" for p in pattern.panels):
        return
    sleeve = pattern.panel("sleeve")
    cap = edge_length(sleeve.edge("cap-front")) + edge_length(sleeve.edge("cap-back"))
    arms = sum(edge_length(pattern.panel(n).edge("armhole")) for n in ("front", "back-right"))
    assert abs(cap - arms - case[1]["sleeve_cap_ease_mm"]) < 0.5


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


def test_a_sleeved_bodice_is_drafted_within_the_budget() -> None:
    raw = RawMeasurements(
        "female", 1650, 880, 640, 960, bust_girth_mm=900, back_waist_length_mm=380
    )
    started = time.perf_counter()
    draft("bodice", raw, {"sleeve_length_mm": 600})
    assert time.perf_counter() - started < 0.1

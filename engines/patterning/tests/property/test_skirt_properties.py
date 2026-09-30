"""Invariants vérifiés sur des mesures tirées au hasard dans les bornes plausibles."""

from hypothesis import given, settings
from hypothesis import strategies as st

from patterning.core.geometry import edge_length, signed_area
from patterning.core.straight_skirt import SkirtInputs, draft_straight_skirt
from patterning.spec.convert import to_spec

skirts = st.builds(
    SkirtInputs,
    stature_mm=st.integers(1400, 2000),
    waist_girth_mm=st.integers(550, 1300),
    hip_girth_mm=st.integers(800, 1500),
    length_mm=st.integers(450, 1100),
    waist_ease_mm=st.integers(0, 80),
    hip_ease_mm=st.integers(0, 200),
    hem_flare_mm=st.integers(0, 200),
)


@settings(max_examples=200, deadline=None)
@given(skirts)
def test_every_panel_is_a_closed_counterclockwise_contour(inputs: SkirtInputs) -> None:
    for panel in draft_straight_skirt(inputs).panels:
        for current, following in zip(panel.edges, panel.edges[1:] + panel.edges[:1], strict=True):
            assert current.end == following.start
        assert signed_area(panel.edges) > 0


@settings(max_examples=200, deadline=None)
@given(skirts)
def test_sewn_edges_have_the_same_length(inputs: SkirtInputs) -> None:
    pattern = draft_straight_skirt(inputs)
    for seam in pattern.seams:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
        assert abs(edge_length(a) - edge_length(b)) < 0.01


@settings(max_examples=50, deadline=None)
@given(skirts)
def test_output_always_matches_the_contract(inputs: SkirtInputs) -> None:
    spec = to_spec(draft_straight_skirt(inputs))
    assert spec.unit == "mm"
    assert {p.id for p in spec.panels} == {"front", "back"}

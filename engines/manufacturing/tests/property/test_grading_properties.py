"""Propriétés de la gradation : tailles identiques, taille translatée."""

from hypothesis import given, settings
from hypothesis import strategies as st

from manufacturing.core.grading import Alignment, SizedPattern, grade_patterns
from manufacturing.core.model import FinishingSettings
from tests.builders import skirt_pattern, translated

offsets = st.integers(min_value=-5000, max_value=5000).map(lambda v: v / 100)


def _deltas(dx: float, dy: float, alignment: Alignment) -> list[tuple[float, float]]:
    skirt = skirt_pattern()
    sizes = [SizedPattern("38", skirt), SizedPattern("40", translated(skirt, dx, dy))]
    result = grade_patterns(sizes, "38", alignment, FinishingSettings())
    return [d for rule in result.rules for v in rule.vertices for d in v.deltas[1:]]


@settings(max_examples=25, deadline=None)
@given(offsets, offsets)
def test_translated_size_gives_the_translation_in_origin(dx: float, dy: float) -> None:
    assert all(d == (dx + 0.0, dy + 0.0) for d in _deltas(dx, dy, Alignment.ORIGIN))


@settings(max_examples=25, deadline=None)
@given(offsets, offsets)
def test_translated_size_gives_zero_in_grainline(dx: float, dy: float) -> None:
    assert all(d == (0.0, 0.0) for d in _deltas(dx, dy, Alignment.GRAINLINE))


def test_identical_sizes_give_zero_deltas() -> None:
    assert all(d == (0.0, 0.0) for d in _deltas(0, 0, Alignment.ORIGIN))

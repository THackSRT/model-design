"""Gradation par recalcul : validation, alignement, écarts."""

from dataclasses import replace

import pytest

from manufacturing.core.errors import ManufacturingError
from manufacturing.core.grading import Alignment, GradedResult, SizedPattern, grade_patterns
from manufacturing.core.model import AllowancePolicy, FinishingSettings, Pattern
from tests.builders import a_pattern, rectangle, scaled_x, skirt_pattern, translated

SETTINGS = FinishingSettings()


def _grade(
    *sizes: tuple[str, Pattern], base: str = "38", alignment: Alignment = Alignment.ORIGIN
) -> GradedResult:
    return grade_patterns([SizedPattern(n, p) for n, p in sizes], base, alignment, SETTINGS)


def _error(*sizes: tuple[str, Pattern], base: str = "38") -> ManufacturingError:
    with pytest.raises(ManufacturingError) as caught:
        _grade(*sizes, base=base)
    assert caught.value.kind == "sizes-mismatch"
    return caught.value


def test_base_size_must_be_one_of_the_sizes() -> None:
    skirt = skirt_pattern()
    assert "42" in _error(("38", skirt), ("40", skirt), base="42").detail


def test_duplicate_size_names_are_rejected() -> None:
    skirt = skirt_pattern()
    assert "40" in _error(("38", skirt), ("40", skirt), ("40", skirt)).detail


def test_different_panels_are_rejected_by_identifiers() -> None:
    skirt = skirt_pattern()
    other = a_pattern(rectangle(10, 10, "sleeve"))
    detail = _error(("38", skirt), ("40", other)).detail
    assert "front" in detail and "sleeve" in detail


def test_different_edges_are_rejected_without_coordinates() -> None:
    a, b = rectangle(100, 100, "p"), rectangle(120, 120, "p")
    b = replace(b, edges=(*b.edges[:3], replace(b.edges[3], id="x")))
    detail = _error(("38", a_pattern(a)), ("40", a_pattern(b))).detail
    assert "p" in detail and "e3" in detail and "x" in detail
    assert "120" not in detail and "100" not in detail


def test_base_deltas_are_zero_and_scaled_size_gives_12_5_mm_at_the_hem_corner() -> None:
    skirt = skirt_pattern()
    result = _grade(("38", skirt), ("40", scaled_x(skirt, 1.05)))
    front = result.rules[0]
    assert [p.panel_id for p in result.rules] == ["front", "back"]
    assert [v.edge_id for v in front.vertices] == [
        "hem",
        "side-lower",
        "side-upper",
        "waist",
        "fold",
    ]
    side_lower = front.vertices[1]
    assert side_lower.deltas == ((0.0, 0.0), (12.5, 0.0))
    assert all(v.deltas[0] == (0.0, 0.0) for v in front.vertices)


def test_origin_does_not_translate() -> None:
    skirt = skirt_pattern()
    result = _grade(("38", skirt), ("40", translated(skirt, 30, 40)))
    base, shifted = result.sizes
    assert shifted.pieces[0].bounds[0] == (
        base.pieces[0].bounds[0][0] + 30,
        base.pieces[0].bounds[0][1] + 40,
    )
    assert result.rules[0].vertices[0].deltas[1] == (30.0, 40.0)


def test_grainline_alignment_moves_every_part_of_the_piece() -> None:
    skirt = skirt_pattern()
    result = _grade(("38", skirt), ("40", translated(skirt, 30, 40)), alignment=Alignment.GRAINLINE)
    base, shifted = (s.pieces[0] for s in result.sizes)
    assert shifted.grainline == base.grainline
    assert shifted.bounds == base.bounds
    assert shifted.label_anchor == base.label_anchor
    assert shifted.fold_line == base.fold_line
    assert shifted.outline.cut_line == base.outline.cut_line
    assert shifted.notches == base.notches
    assert all(d == (0.0, 0.0) for v in result.rules[0].vertices for d in v.deltas)


def test_finishing_errors_surface_with_their_kind() -> None:
    skirt = skirt_pattern()
    bad = FinishingSettings(policy=AllowancePolicy(by_edge={("front", "fold"): 10.0}))
    sizes = [SizedPattern("38", skirt), SizedPattern("40", skirt)]
    with pytest.raises(ManufacturingError) as caught:
        grade_patterns(sizes, "38", Alignment.ORIGIN, bad)
    assert caught.value.kind == "allowance-on-fold"

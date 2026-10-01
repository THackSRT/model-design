"""Droit fil, pliure, étiquette, encombrement et aire."""

from dataclasses import replace

import pytest

from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import centroid, compute_cut_pieces
from manufacturing.core.model import AllowancePolicy, EdgeRole
from tests.builders import a_pattern, polygon_panel, rectangle, skirt_pattern

POLICY = AllowancePolicy(default_mm=10)


def test_missing_grainline_is_vertical_from_20_to_80_percent_of_the_height() -> None:
    piece = compute_cut_pieces(a_pattern(rectangle(100, 200)), POLICY)[0]
    assert piece.grainline == ((50, 40), (50, 160))


def test_grainline_of_the_spec_is_kept() -> None:
    panel = replace(rectangle(100, 200), grainline=((1, 2), (3, 4)))
    assert compute_cut_pieces(a_pattern(panel), POLICY)[0].grainline == ((1, 2), (3, 4))


def test_fold_line_is_the_fold_edge_when_cut_on_fold() -> None:
    front = compute_cut_pieces(skirt_pattern())[0]
    assert front.cut_on_fold
    assert front.fold_line == ((0, 600), (0, 0))


def test_no_fold_line_when_not_cut_on_fold() -> None:
    piece = compute_cut_pieces(a_pattern(rectangle(100, 200)), POLICY)[0]
    assert piece.fold_line is None


def test_cut_on_fold_without_fold_edge_is_rejected() -> None:
    panel = replace(rectangle(100, 200), cut_on_fold=True)
    with pytest.raises(ManufacturingError) as error:
        compute_cut_pieces(a_pattern(panel), POLICY)
    assert error.value.kind == "fold-edge-missing"


def test_fold_edge_without_cut_on_fold_gives_no_fold_line() -> None:
    roles = [EdgeRole.SEAM, EdgeRole.SEAM, EdgeRole.SEAM, EdgeRole.FOLD]
    panel = polygon_panel([(0, 0), (100, 0), (100, 200), (0, 200)], "p", roles)
    assert compute_cut_pieces(a_pattern(panel), POLICY)[0].fold_line is None


def test_label_anchor_is_the_centroid_when_inside() -> None:
    piece = compute_cut_pieces(a_pattern(rectangle(100, 200)), POLICY)[0]
    assert piece.label_anchor == (50, 100)


def test_label_anchor_falls_back_to_grainline_middle_for_a_c_shape() -> None:
    c_shape = [(0, 0), (100, 0), (100, 20), (20, 20), (20, 180), (100, 180), (100, 200), (0, 200)]
    assert centroid(tuple(c_shape)) is not None
    piece = compute_cut_pieces(a_pattern(polygon_panel(c_shape, "c")), AllowancePolicy(0))[0]
    assert piece.label_anchor == (50, 100)


def test_bounds_and_area_of_the_cut_line() -> None:
    piece = compute_cut_pieces(a_pattern(rectangle(100, 200)), POLICY)[0]
    assert piece.bounds == ((-10, -10), (110, 210))
    assert piece.cut_area_mm2 == 120 * 220


def test_skirt_front_is_drawn_as_a_half() -> None:
    front = compute_cut_pieces(skirt_pattern())[0]
    assert front.bounds[0] == (0, -30)
    assert front.quantity == 1

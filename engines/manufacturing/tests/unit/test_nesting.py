"""Placement en ligne d'horizon : positions, écarts, bord de pliure."""

import pytest

from manufacturing.core.nesting import Box, nest


def test_first_box_is_bottom_left() -> None:
    assert nest([Box(100, 40)], 200, 5) == [(0, 0)]


def test_next_box_goes_above_the_first_when_it_fits_the_width() -> None:
    positions = nest([Box(50, 40), Box(30, 40)], 100, 5)
    assert positions == [(0, 0), (0, 45)]


def test_next_box_goes_further_in_x_when_the_width_is_full() -> None:
    positions = nest([Box(50, 60), Box(30, 60)], 100, 5)
    assert positions == [(0, 0), (55, 0)]


def test_edge_box_is_only_tried_at_y_zero() -> None:
    positions = nest([Box(50, 40), Box(30, 40, at_edge=True)], 100, 5)
    assert positions[1] == (55, 0)


def test_spacing_is_kept_in_x_and_in_y() -> None:
    positions = nest([Box(20, 30), Box(60, 30), Box(40, 30)], 100, 10)
    assert positions == [(0, 0), (0, 40), (30, 0)]


def test_too_wide_box_is_a_programming_error() -> None:
    with pytest.raises(ValueError, match="plus large"):
        nest([Box(10, 120)], 100, 5)

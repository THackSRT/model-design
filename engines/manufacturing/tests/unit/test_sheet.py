"""Planche : rangement en étagères, largeur et marges."""

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.model import DEFAULT_POLICY, CutPiece
from manufacturing.export.sheet import GAP_MM, MIN_WIDTH_MM, layout
from tests.builders import a_pattern, rectangle


def _pieces(*sizes: tuple[float, float]) -> tuple[CutPiece, ...]:
    panels = [rectangle(w, h, f"r{i}") for i, (w, h) in enumerate(sizes)]
    return compute_cut_pieces(a_pattern(*panels), DEFAULT_POLICY, (), False)


def _width(piece: CutPiece) -> float:
    return piece.bounds[1][0] - piece.bounds[0][0]


def _height(piece: CutPiece) -> float:
    return piece.bounds[1][1] - piece.bounds[0][1]


def test_width_is_four_a4_columns_by_default() -> None:
    assert layout(_pieces((100, 100))).width_mm == MIN_WIDTH_MM == 760


def test_width_grows_for_a_wide_piece() -> None:
    pieces = _pieces((1000, 100))
    assert layout(pieces).width_mm == _width(pieces[0]) + 2 * GAP_MM


def test_pieces_fill_a_shelf_then_wrap() -> None:
    pieces = _pieces((300, 100), (300, 80), (300, 100))
    sheet = layout(pieces)
    xs = [off[0] + p.bounds[0][0] for off, p in zip(sheet.offsets, pieces, strict=True)]
    assert xs[0] == GAP_MM
    assert xs[1] == GAP_MM + _width(pieces[0]) + GAP_MM
    assert xs[2] == GAP_MM  # la troisième ne tient plus : nouvelle étagère
    first_row = max(_height(pieces[0]), _height(pieces[1]))
    assert sheet.height_mm == GAP_MM + (first_row + GAP_MM) + (_height(pieces[2]) + GAP_MM)


def test_pieces_never_overlap_and_stay_inside() -> None:
    pieces = _pieces((300, 100), (200, 250), (500, 50), (100, 100), (350, 350))
    sheet = layout(pieces)
    boxes = []
    for (ox, oy), p in zip(sheet.offsets, pieces, strict=True):
        (x0, y0), (x1, y1) = p.bounds
        boxes.append((x0 + ox, y0 + oy, x1 + ox, y1 + oy))
    for x0, y0, x1, y1 in boxes:
        assert x0 >= GAP_MM - 1e-9 and x1 <= sheet.width_mm - GAP_MM + 1e-9
        assert y0 >= GAP_MM - 1e-9 and y1 <= sheet.height_mm - GAP_MM + 1e-9
    for i, a in enumerate(boxes):
        for b in boxes[i + 1 :]:
            assert a[2] <= b[0] or b[2] <= a[0] or a[3] <= b[1] or b[3] <= a[1]


def test_empty_sheet_is_still_a_valid_size() -> None:
    sheet = layout(())
    assert sheet.width_mm == MIN_WIDTH_MM and sheet.height_mm > 0

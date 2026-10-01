"""PDF A4 tuilé : page 1 = plan d'assemblage et carré de contrôle, puis une page par tuile.

Pages A4 bord à bord (sans recouvrement) : zone utile de 190 x 277 mm à 10 mm du bord, cadre fin et
repères de raccord au milieu de chaque côté.
"""

import math
from dataclasses import dataclass

from manufacturing.core.model import CutPiece, Point
from manufacturing.export.labels import Labels, labels_for
from manufacturing.export.pdf_writer import (
    PAGE_HEIGHT_MM,
    PAGE_WIDTH_MM,
    Canvas,
    PdfDocument,
)
from manufacturing.export.sheet import ExportJob, Sheet, layout
from manufacturing.export.svg import (
    ARROW_LENGTH_MM,
    CUT_STROKE_MM,
    FOLD_STROKE_MM,
    FOLD_TEXT_OFFSET_MM,
    GRAIN_STROKE_MM,
    LINE_HEIGHT_MM,
    NAME_FONT_MM,
    NOTCH_STROKE_MM,
    SEAM_STROKE_MM,
    TEXT_FONT_MM,
)

MARGIN_MM = 10.0
TILE_W_MM = PAGE_WIDTH_MM - 2 * MARGIN_MM  # 190
TILE_H_MM = PAGE_HEIGHT_MM - 2 * MARGIN_MM  # 277
CONTROL_SQUARE_MM = 100.0
FRAME_STROKE_MM = 0.1
MARK_LENGTH_MM = 4.0
TILE_NAME_MM = 5.0
TITLE_MM = 7.0
THUMB_MAX_HEIGHT_MM = 125.0
THUMB_TOP_MM = 255.0
THUMB_NAME_MM = 6.0


@dataclass(frozen=True)
class Grid:
    columns: int
    rows: int


def grid_for(sheet: Sheet) -> Grid:
    return Grid(
        max(1, math.ceil(sheet.width_mm / TILE_W_MM)),
        max(1, math.ceil(sheet.height_mm / TILE_H_MM)),
    )


def row_letters(row: int) -> str:
    """0 → A, 25 → Z, 26 → AA."""
    name = ""
    number = row + 1
    while number > 0:
        number, rest = divmod(number - 1, 26)
        name = chr(65 + rest) + name
    return name


def tile_name(row: int, column: int) -> str:
    return f"{row_letters(row)}{column + 1}"


def _shift(p: Point, offset: Point) -> Point:
    return (p[0] + offset[0], p[1] + offset[1])


def _shifted(points: tuple[Point, ...], offset: Point) -> tuple[Point, ...]:
    return tuple(_shift(p, offset) for p in points)


def _grainline(canvas: Canvas, piece: CutPiece, offset: Point) -> None:
    start, end = (_shift(p, offset) for p in piece.grainline)
    canvas.width(GRAIN_STROKE_MM)
    canvas.line(start, end)
    if math.dist(start, end) > 2 * ARROW_LENGTH_MM:
        canvas.arrow_head(start, end, ARROW_LENGTH_MM)
        canvas.arrow_head(end, start, ARROW_LENGTH_MM)


def _fold(canvas: Canvas, piece: CutPiece, offset: Point, labels: Labels) -> None:
    if piece.fold_line is None:
        return
    start, end = (_shift(p, offset) for p in piece.fold_line)
    canvas.width(FOLD_STROKE_MM)
    canvas.line(start, end)
    mid = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
    center_x = (piece.bounds[0][0] + piece.bounds[1][0]) / 2 + offset[0]
    if mid[0] < center_x:
        canvas.text((mid[0] + FOLD_TEXT_OFFSET_MM, mid[1]), labels.fold, TEXT_FONT_MM)
    else:
        end_point = (mid[0] - FOLD_TEXT_OFFSET_MM, mid[1])
        canvas.text_ended(end_point, labels.fold, TEXT_FONT_MM)


def _annotations(canvas: Canvas, piece: CutPiece, offset: Point, job: ExportJob) -> None:
    labels = labels_for(job.locale)
    lines = [
        (piece.name, NAME_FONT_MM),
        (labels.cut_line(piece.quantity, piece.cut_on_fold), TEXT_FONT_MM),
    ]
    for extra in (job.size_label, job.reference):
        if extra:
            lines.append((extra, TEXT_FONT_MM))
    x, y = _shift(piece.label_anchor, offset)
    for i, (text, size) in enumerate(lines):
        canvas.text_centered((x, y - i * LINE_HEIGHT_MM), text, size)


def _draw_piece(canvas: Canvas, piece: CutPiece, offset: Point, job: ExportJob) -> None:
    canvas.width(CUT_STROKE_MM)
    canvas.polygon(_shifted(piece.outline.cut_line, offset))
    canvas.width(SEAM_STROKE_MM)
    canvas.dash(4.0, 2.0)
    canvas.polygon(_shifted(piece.outline.seam_line, offset))
    canvas.dash()
    canvas.width(NOTCH_STROKE_MM)
    for mark in piece.notches:
        for a, b in mark.segments:
            canvas.line(_shift(a, offset), _shift(b, offset))
    _grainline(canvas, piece, offset)
    _fold(canvas, piece, offset, labels_for(job.locale))
    _annotations(canvas, piece, offset, job)


def _intersects(piece: CutPiece, offset: Point, region: tuple[Point, Point]) -> bool:
    (x0, y0), (x1, y1) = (_shift(p, offset) for p in piece.bounds)
    (rx0, ry0), (rx1, ry1) = region
    return x0 <= rx1 and x1 >= rx0 and y0 <= ry1 and y1 >= ry0


def _frame_and_marks(canvas: Canvas) -> None:
    left, bottom = MARGIN_MM, MARGIN_MM
    right, top = left + TILE_W_MM, bottom + TILE_H_MM
    mid_x, mid_y = (left + right) / 2, (bottom + top) / 2
    canvas.width(FRAME_STROKE_MM)
    canvas.rect(left, bottom, TILE_W_MM, TILE_H_MM)
    tick = MARK_LENGTH_MM
    canvas.line((left - tick, mid_y), (left, mid_y))
    canvas.line((right, mid_y), (right + tick, mid_y))
    canvas.line((mid_x, bottom - tick), (mid_x, bottom))
    canvas.line((mid_x, top), (mid_x, top + tick))


def _tile_page(doc: PdfDocument, sheet: Sheet, job: ExportJob, cell: tuple[int, int]) -> None:
    row, column = cell
    origin = (column * TILE_W_MM, sheet.height_mm - (row + 1) * TILE_H_MM)  # coin bas gauche
    shift = (MARGIN_MM - origin[0], MARGIN_MM - origin[1])
    region = (origin, (origin[0] + TILE_W_MM, origin[1] + TILE_H_MM))
    canvas = doc.add_page()
    canvas.save()
    canvas.clip_rect(MARGIN_MM, MARGIN_MM, TILE_W_MM, TILE_H_MM)
    for index, piece in enumerate(job.pieces):
        offset = sheet.offsets[index]
        if _intersects(piece, offset, region):
            _draw_piece(canvas, piece, (offset[0] + shift[0], offset[1] + shift[1]), job)
    canvas.restore()
    _frame_and_marks(canvas)
    canvas.text((MARGIN_MM, PAGE_HEIGHT_MM - MARGIN_MM + 4.0), tile_name(row, column), TILE_NAME_MM)


def _title(canvas: Canvas, job: ExportJob, grid: Grid) -> None:
    parts = [p for p in (job.reference, job.size_label, job.garment_type) if p]
    pages = 1 + grid.rows * grid.columns
    canvas.text((MARGIN_MM, 280.0), " - ".join(parts), TITLE_MM)
    canvas.text(
        (MARGIN_MM, 271.0), f"A4 : {grid.columns} x {grid.rows} ({pages} pages)", TEXT_FONT_MM
    )


def _thumbnail(canvas: Canvas, sheet: Sheet, job: ExportJob, grid: Grid) -> None:
    scale = min(TILE_W_MM / sheet.width_mm, THUMB_MAX_HEIGHT_MM / sheet.height_mm)
    left, top = MARGIN_MM, THUMB_TOP_MM
    width, height = sheet.width_mm * scale, sheet.height_mm * scale

    def to_page(p: Point) -> Point:
        return (left + p[0] * scale, top - height + p[1] * scale)

    canvas.width(FRAME_STROKE_MM)
    canvas.rect(left, top - height, width, height)
    for c in range(1, grid.columns):
        x = left + c * TILE_W_MM * scale
        canvas.line((x, top - height), (x, top))
    for r in range(1, grid.rows):
        y = top - r * TILE_H_MM * scale
        canvas.line((left, y), (left + width, y))
    canvas.width(FRAME_STROKE_MM * 2)
    for index, piece in enumerate(job.pieces):
        offset = sheet.offsets[index]
        canvas.polygon(tuple(to_page(_shift(p, offset)) for p in piece.outline.cut_line))
    for r in range(grid.rows):
        for c in range(grid.columns):
            center = ((c + 0.5) * TILE_W_MM * scale, (r + 0.5) * TILE_H_MM * scale)
            point = (left + center[0], top - center[1] - THUMB_NAME_MM / 3)
            canvas.text_centered(point, tile_name(r, c), THUMB_NAME_MM)


def _control_square(canvas: Canvas) -> None:
    canvas.width(0.3)
    canvas.rect(MARGIN_MM, MARGIN_MM, CONTROL_SQUARE_MM, CONTROL_SQUARE_MM)
    canvas.text((MARGIN_MM, MARGIN_MM + CONTROL_SQUARE_MM + 3.0), "100 mm", TEXT_FONT_MM)


def render_pdf(job: ExportJob) -> bytes:
    sheet = layout(job.pieces)
    grid = grid_for(sheet)
    doc = PdfDocument()
    first = doc.add_page()
    _title(first, job, grid)
    _thumbnail(first, sheet, job, grid)
    _control_square(first)
    for row in range(grid.rows):
        for column in range(grid.columns):
            _tile_page(doc, sheet, job, (row, column))
    return doc.build()

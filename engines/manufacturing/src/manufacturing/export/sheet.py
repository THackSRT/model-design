"""Planche : pièces sans rotation, rangées en étagères de gauche à droite (mm, y vers le haut).

Réutilisée par le SVG, le PDF A4 tuilé et le DXF.
"""

from dataclasses import dataclass

from manufacturing.core.model import CutPiece, Point

GAP_MM = 20.0  # écart entre pièces et marge de la planche
MIN_WIDTH_MM = 4 * 190.0  # quatre pages A4 (190 mm utiles) de large


@dataclass(frozen=True)
class ExportJob:
    """Ce qu'un exporteur reçoit : pièces finies et textes à écrire dessus."""

    garment_type: str
    pieces: tuple[CutPiece, ...]
    size_label: str | None = None
    reference: str | None = None
    locale: str = "fr"


@dataclass(frozen=True)
class Sheet:
    """`offsets[i]` : translation (x, y) à appliquer à la pièce i, dans le repère y vers le haut."""

    width_mm: float
    height_mm: float
    offsets: tuple[Point, ...]


def _size(piece: CutPiece) -> tuple[float, float]:
    (x0, y0), (x1, y1) = piece.bounds
    return (x1 - x0, y1 - y0)


def _rows(sizes: list[tuple[float, float]], width: float) -> list[list[int]]:
    rows: list[list[int]] = []
    used = 0.0
    for index, (w, _) in enumerate(sizes):
        if not rows or used + w > width - GAP_MM:
            rows.append([])
            used = GAP_MM
        rows[-1].append(index)
        used += w + GAP_MM
    return rows


def layout(pieces: tuple[CutPiece, ...]) -> Sheet:
    sizes = [_size(p) for p in pieces]
    widest = max((w for w, _ in sizes), default=0.0)
    width = max(MIN_WIDTH_MM, widest + 2 * GAP_MM)
    rows = _rows(sizes, width)
    height = GAP_MM + sum(max(sizes[i][1] for i in row) + GAP_MM for row in rows)
    height = max(height, 2 * GAP_MM)
    offsets: list[Point] = [(0.0, 0.0)] * len(pieces)
    top = GAP_MM  # distance depuis le haut de la planche
    for row in rows:
        x = GAP_MM
        for i in row:
            (min_x, _), (_, max_y) = pieces[i].bounds
            offsets[i] = (x - min_x, (height - top) - max_y)
            x += sizes[i][0] + GAP_MM
        top += max(sizes[i][1] for i in row) + GAP_MM
    return Sheet(width, height, tuple(offsets))

"""Dépliage d'une pièce sur pliure : contour entier par symétrie autour de la ligne de pliure."""

from manufacturing.core.errors import FOLD_EDGE_MISSING, ManufacturingError
from manufacturing.core.geometry import EPSILON, distance
from manufacturing.core.model import CutPiece, Point

ON_FOLD_LINE_MM = 0.01


def _reflect(p: Point, a: Point, b: Point) -> Point:
    """Symétrique de `p` par rapport à la droite (ab)."""
    length = distance(a, b)
    dx, dy = (b[0] - a[0]) / length, (b[1] - a[1]) / length
    vx, vy = p[0] - a[0], p[1] - a[1]
    along = vx * dx + vy * dy
    return (a[0] + 2 * along * dx - vx, a[1] + 2 * along * dy - vy)


def _line_distance(p: Point, a: Point, b: Point) -> float:
    cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
    return abs(cross) / distance(a, b)


def _longest_run(flags: list[bool]) -> tuple[int, int]:
    """Plus longue suite cyclique de vrais : (indice du dernier, longueur)."""
    n = len(flags)
    best = (-1, 0)
    for start in range(n):
        if not flags[start] or flags[start - 1]:
            continue
        length = 1
        while length < n and flags[(start + length) % n]:
            length += 1
        if length > best[1]:
            best = ((start + length - 1) % n, length)
    return best


def unfold(piece: CutPiece) -> list[Point]:
    """Contour entier d'une pièce sur pliure : la ligne de coupe et son symétrique, fusionnés."""
    fold = piece.fold_line
    line = piece.outline.cut_line
    if fold is None or distance(*fold) < EPSILON:
        raise ManufacturingError(
            FOLD_EDGE_MISSING, f"pièce {piece.outline.panel_id} : pliure nulle"
        )
    on_fold = [_line_distance(p, *fold) <= ON_FOLD_LINE_MM for p in line]
    last, run = _longest_run(on_fold)
    if run < 2 or run == len(line):
        raise ManufacturingError(
            FOLD_EDGE_MISSING, f"pièce {piece.outline.panel_id} : ligne de coupe hors pliure"
        )
    n = len(line)
    path = [line[(last + k) % n] for k in range(n - run + 2)]
    mirror = [_reflect(p, *fold) for p in path]
    return path + mirror[-2:0:-1]

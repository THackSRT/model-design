"""Placement « ligne d'horizon » bas-gauche sur les rectangles englobants (déterministe)."""

from dataclasses import dataclass

from manufacturing.core.model import Point

EPSILON = 1e-9


@dataclass(frozen=True)
class Box:
    """Rectangle à placer : étendue en x (longueur), en y (travers), collé à y = 0 si `at_edge`."""

    length_mm: float
    width_mm: float
    at_edge: bool = False


type Segment = tuple[float, float, float]  # (y0, y1, x_top) : le tissu est occupé jusqu'à x_top


def _front(horizon: list[Segment], y: float, top: float) -> float:
    """Plus petit x possible pour un rectangle couvrant [y, top] en y."""
    return max(x for y0, y1, x in horizon if y1 > y + EPSILON and y0 < top - EPSILON)


def _merge(horizon: list[Segment]) -> list[Segment]:
    merged: list[Segment] = []
    for y0, y1, x in sorted(horizon):
        if merged and abs(merged[-1][2] - x) <= EPSILON:
            merged[-1] = (merged[-1][0], y1, x)
        else:
            merged.append((y0, y1, x))
    return merged


def _occupy(horizon: list[Segment], span: tuple[float, float], x_top: float) -> list[Segment]:
    """Horizon après avoir réservé la bande `span` jusqu'à `x_top`."""
    y, top = span
    out: list[Segment] = []
    for y0, y1, x in horizon:
        if y1 <= y + EPSILON or y0 >= top - EPSILON:
            out.append((y0, y1, x))
            continue
        if y0 < y - EPSILON:
            out.append((y0, y, x))
        out.append((max(y0, y), min(y1, top), max(x, x_top)))
        if y1 > top + EPSILON:
            out.append((top, y1, x))
    return _merge(out)


def _best_position(horizon: list[Segment], box: Box, limits: tuple[float, float]) -> Point:
    usable_mm, spacing_mm = limits
    starts = [0.0] if box.at_edge else [y0 for y0, _, _ in horizon]
    best: Point | None = None
    for y in starts:
        if y + box.width_mm > usable_mm + EPSILON:
            continue
        # Le x tient aussi compte des pièces déjà posées juste au-dessus (à moins de `spacing_mm`).
        x = _front(horizon, y, y + box.width_mm + spacing_mm)
        if best is None or x < best[0] - EPSILON:
            best = (x, y)
    if best is None:  # ne devrait pas arriver : l'appelant a vérifié la largeur
        raise ValueError("pièce plus large que la largeur utile")
    return best


def nest(boxes: list[Box], usable_mm: float, spacing_mm: float) -> list[Point]:
    """Coin bas-gauche (x, y) de chaque rectangle, dans l'ordre donné.

    L'horizon est une suite de segments `(y0, y1, x_top)` couvrant [0, largeur utile] ; chaque
    rectangle prend le plus petit x, puis le plus petit y, parmi les débuts de segments.
    """
    horizon: list[Segment] = [(0.0, usable_mm, 0.0)]
    positions: list[Point] = []
    for box in boxes:
        x, y = _best_position(horizon, box, (usable_mm, spacing_mm))
        top = min(y + box.width_mm + spacing_mm, usable_mm)
        horizon = _occupy(horizon, (y, top), x + box.length_mm + spacing_mm)
        positions.append((x, y))
    return positions

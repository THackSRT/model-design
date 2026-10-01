"""Crans : emplacements demandés, fournis par la spécification ou automatiques, et entailles."""

import math
from itertools import pairwise

from manufacturing.core.darts import dart_pairs
from manufacturing.core.errors import NOTCH_OUTSIDE_EDGE, UNKNOWN_EDGE, ManufacturingError
from manufacturing.core.geometry import EPSILON, distance, round_point, signed_area
from manufacturing.core.model import (
    CutOutline,
    FinishingSettings,
    NotchMark,
    NotchPlacement,
    NotchSource,
    Panel,
    Pattern,
    Point,
    SeamEdge,
)

MAX_NOTCH_DEPTH_MM = 6.0
NO_ALLOWANCE_DEPTH_MM = 3.0
NOTCH_SPACING_MM = 4.0
JUNCTION_MAX_TURN_DEG = 30.0
DISTANCE_TOLERANCE_MM = 0.01
POSITION_TOLERANCE_MM = 0.011  # positions arrondies à 0,01 mm


def polyline_length(points: tuple[Point, ...]) -> float:
    return sum(distance(a, b) for a, b in pairwise(points))


def _point_at(points: tuple[Point, ...], target: float) -> tuple[Point, Point]:
    """Point à `target` mm du début de la polyligne et tangente unitaire du segment portant."""
    walked = 0.0
    chosen = (points[0], points[1])
    for a, b in pairwise(points):
        length = distance(a, b)
        if length < EPSILON:
            continue
        chosen = (a, b)
        if walked + length >= target:
            break
        walked += length
    a, b = chosen
    length = distance(a, b)
    tangent = ((b[0] - a[0]) / length, (b[1] - a[1]) / length)
    t = min(max(target - walked, 0.0), length)
    return (a[0] + tangent[0] * t, a[1] + tangent[1] * t), tangent


def _segments(
    edge: SeamEdge, at: tuple[Point, Point], count: int, orientation: float
) -> tuple[tuple[Point, Point], ...]:
    """Entailles perpendiculaires au bord, de la ligne de coupe vers l'intérieur."""
    position, tangent = at
    normal = (tangent[1] * orientation, -tangent[0] * orientation)
    a = edge.allowance_mm
    near, far = (a, a - min(a, MAX_NOTCH_DEPTH_MM)) if a > 0 else (0.0, -NO_ALLOWANCE_DEPTH_MM)
    result: list[tuple[Point, Point]] = []
    for i in range(count):
        shift = (i - (count - 1) / 2) * NOTCH_SPACING_MM
        base = (position[0] + tangent[0] * shift, position[1] + tangent[1] * shift)
        start = (base[0] + normal[0] * near, base[1] + normal[1] * near)
        end = (base[0] + normal[0] * far, base[1] + normal[1] * far)
        result.append((round_point(start), round_point(end)))
    return tuple(result)


def place_notch(outline: CutOutline, placement: NotchPlacement, source: NotchSource) -> NotchMark:
    """Cran sur la ligne de couture ; `notch-outside-edge` si la distance dépasse le bord."""
    edge = next((e for e in outline.seam_edges if e.edge_id == placement.edge_id), None)
    if edge is None:
        raise ManufacturingError(
            UNKNOWN_EDGE, f"pièce {outline.panel_id}, bord {placement.edge_id} inconnus"
        )
    length = polyline_length(edge.points)
    if placement.distance_mm > length + DISTANCE_TOLERANCE_MM:
        raise ManufacturingError(
            NOTCH_OUTSIDE_EDGE,
            f"pièce {outline.panel_id} : le cran dépasse le bord {placement.edge_id}",
        )
    at = _point_at(edge.points, min(placement.distance_mm, length))
    orientation = 1.0 if signed_area(outline.seam_line) > 0 else -1.0
    return NotchMark(
        edge.edge_id,
        round(placement.distance_mm, 2) + 0.0,
        placement.count,
        source,
        round_point(at[0]),
        _segments(edge, at, placement.count, orientation),
    )


def _turn_degrees(first: tuple[Point, Point], second: tuple[Point, Point]) -> float:
    ux, uy = first[1][0] - first[0][0], first[1][1] - first[0][1]
    vx, vy = second[1][0] - second[0][0], second[1][1] - second[0][1]
    return abs(math.degrees(math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)))


def _end_tangent(points: tuple[Point, ...]) -> tuple[Point, Point]:
    return next((a, b) for a, b in reversed(list(pairwise(points))) if distance(a, b) > EPSILON)


def _start_tangent(points: tuple[Point, ...]) -> tuple[Point, Point]:
    return next((a, b) for a, b in pairwise(points) if distance(a, b) > EPSILON)


def auto_placements(pattern: Pattern, panel: Panel, outline: CutOutline) -> list[NotchPlacement]:
    """Un cran au début du second de deux bords consécutifs cousus presque alignés."""
    sewn = {
        edge_id
        for seam in pattern.seams
        for panel_id, edge_id in (seam.a, seam.b)
        if panel_id == panel.id
    }
    edges = outline.seam_edges
    placements: list[NotchPlacement] = []
    for current, following in zip(edges, edges[1:] + edges[:1], strict=True):
        if current.edge_id not in sewn or following.edge_id not in sewn:
            continue
        turn = _turn_degrees(_end_tangent(current.points), _start_tangent(following.points))
        if turn < JUNCTION_MAX_TURN_DEG:
            placements.append(NotchPlacement(following.edge_id, 0.0, 1))
    return placements


def dart_placements(pattern: Pattern, panel: Panel, outline: CutOutline) -> list[NotchPlacement]:
    """Un cran à chaque bout du pont d'une pince : fin du bord qui la précède, début du suivant."""
    edges = outline.seam_edges
    placements: list[NotchPlacement] = []
    for first, second in dart_pairs(pattern, panel):
        before, after = edges[(first - 1) % len(edges)], edges[(second + 1) % len(edges)]
        placements.append(NotchPlacement(before.edge_id, polyline_length(before.points)))
        placements.append(NotchPlacement(after.edge_id, 0.0))
    return placements


def place_notches(
    pattern: Pattern,
    panel: Panel,
    outline: CutOutline,
    settings: FinishingSettings,
) -> tuple[NotchMark, ...]:
    """Crans d'une pièce. Priorité au même point de la couture (fin d'un bord = début du suivant
    compris) : demande > spécification > automatique."""
    candidates = [
        (r.placement, NotchSource.REQUESTED) for r in settings.requests if r.panel_id == panel.id
    ]
    candidates += [(p, NotchSource.REQUESTED) for p in panel.notches]
    if settings.auto_notches:
        autos = auto_placements(pattern, panel, outline)
        autos += dart_placements(pattern, panel, outline)
        candidates += [(p, NotchSource.AUTO) for p in autos]
    marks: list[NotchMark] = []
    for placement, source in candidates:  # par priorité décroissante
        mark = place_notch(outline, placement, source)
        if all(distance(mark.position, kept.position) > POSITION_TOLERANCE_MM for kept in marks):
            marks.append(mark)
    order = {e.edge_id: i for i, e in enumerate(outline.seam_edges)}
    return tuple(sorted(marks, key=lambda m: (order[m.edge_id], m.distance_mm)))

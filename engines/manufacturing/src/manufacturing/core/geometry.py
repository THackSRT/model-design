"""Géométrie plane en Python pur : aplatissement des bords, aire signée, intersections."""

from collections.abc import Sequence
from itertools import pairwise

from manufacturing.core.errors import OPEN_CONTOUR, ManufacturingError
from manufacturing.core.model import Edge, Panel, Point

BEZIER_SAMPLES = 64
CLOSURE_TOLERANCE_MM = 0.01
PRECISION_MM = 2  # décimales conservées en sortie : 0,01 mm
EPSILON = 1e-9


def round_point(p: Point) -> Point:
    return (round(p[0], PRECISION_MM) + 0.0, round(p[1], PRECISION_MM) + 0.0)


def distance(a: Point, b: Point) -> float:
    return float(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)


def _bezier_point(points: tuple[Point, ...], t: float) -> Point:
    """Algorithme de De Casteljau, quel que soit le degré."""
    current = list(points)
    while len(current) > 1:
        current = [
            ((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]) for a, b in pairwise(current)
        ]
    return current[0]


def flatten_edge(edge: Edge, samples: int = BEZIER_SAMPLES) -> list[Point]:
    """Bord droit : 2 points ; courbe : `samples` segments, extrémités exactes."""
    if not edge.controls:
        return [edge.start, edge.end]
    points = (edge.start, *edge.controls, edge.end)
    flat = [_bezier_point(points, i / samples) for i in range(samples + 1)]
    flat[0], flat[-1] = edge.start, edge.end
    return flat


def flatten_panel(panel: Panel) -> list[list[Point]]:
    """Bords aplatis d'une pièce ; contour non fermé (écart > 0,01 mm) : `open-contour`."""
    edges = panel.edges
    for current, following in zip(edges, edges[1:] + edges[:1], strict=True):
        if distance(current.end, following.start) > CLOSURE_TOLERANCE_MM:
            raise ManufacturingError(
                OPEN_CONTOUR,
                f"pièce {panel.id} : le bord {current.id} ne rejoint pas le bord {following.id}",
            )
    return [flatten_edge(e) for e in edges]


def signed_area(points: Sequence[Point]) -> float:
    """Aire signée d'un polygone (positive dans le sens trigonométrique)."""
    total = 0.0
    for (x1, y1), (x2, y2) in pairwise((*points, points[0])):
        total += x1 * y2 - x2 * y1
    return total / 2


def dedupe(points: Sequence[Point], closed: bool = False) -> list[Point]:
    """Retire les points consécutifs confondus (et le dernier s'il égale le premier si `closed`)."""
    out: list[Point] = []
    for p in points:
        if not out or distance(out[-1], p) > EPSILON:
            out.append(p)
    if closed and len(out) > 1 and distance(out[0], out[-1]) <= EPSILON:
        out.pop()
    return out


def _cross(o: Point, a: Point, b: Point) -> float:
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])


def segment_intersection(a: Point, b: Point, c: Point, d: Point) -> Point | None:
    """Point de croisement strict de [ab] et [cd] (les contacts aux extrémités sont ignorés)."""
    d1, d2 = _cross(a, b, c), _cross(a, b, d)
    d3, d4 = _cross(c, d, a), _cross(c, d, b)
    if d1 * d2 >= 0 or d3 * d4 >= 0:
        return None
    t = d3 / (d3 - d4)
    return (a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1]))


def _boxes_overlap(a: Point, b: Point, c: Point, d: Point) -> bool:
    return max(min(a[0], b[0]), min(c[0], d[0])) <= min(max(a[0], b[0]), max(c[0], d[0])) and max(
        min(a[1], b[1]), min(c[1], d[1])
    ) <= min(max(a[1], b[1]), max(c[1], d[1]))


def is_simple(polygon: Sequence[Point]) -> bool:
    """Vrai si aucune paire de segments non voisins ne se croise (boîtes englobantes d'abord)."""
    n = len(polygon)
    segments = [(polygon[i], polygon[(i + 1) % n]) for i in range(n)]
    for i in range(n):
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            (a, b), (c, d) = segments[i], segments[j]
            if _boxes_overlap(a, b, c, d) and segment_intersection(a, b, c, d) is not None:
                return False
    return True


def _on_segment(p: Point, a: Point, b: Point, tolerance: float) -> bool:
    length = distance(a, b)
    if length < EPSILON:
        return distance(p, a) <= tolerance
    if abs(_cross(a, b, p)) / length > tolerance:
        return False
    t = ((p[0] - a[0]) * (b[0] - a[0]) + (p[1] - a[1]) * (b[1] - a[1])) / (length * length)
    return -tolerance / length <= t <= 1 + tolerance / length


def point_in_polygon(p: Point, polygon: Sequence[Point], tolerance: float = 1e-3) -> bool:
    """Point dans le polygone, bord compris (à `tolerance` mm près)."""
    inside = False
    for a, b in pairwise((*polygon, polygon[0])):
        if _on_segment(p, a, b, tolerance):
            return True
        if (a[1] > p[1]) != (b[1] > p[1]):
            x = a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x > p[0]:
                inside = not inside
    return inside

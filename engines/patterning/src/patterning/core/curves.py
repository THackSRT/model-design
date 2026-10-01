"""Constructions de courbes déterministes (mm) : tangentes, arcs, découpe à une longueur.

Réécriture ciblée de constructions de GarmentCode (`pygarment/garmentcode/edge_factory.py`, commit
d449629, licence MIT ; voir ADR 0010), sans optimisation numérique à arrêt par tolérance : les
ajustements passent par une dichotomie à nombre d'itérations fixe.
"""

import math
from itertools import pairwise

from patterning.core.errors import DraftingError
from patterning.core.geometry import bezier_point, edge_length
from patterning.core.model import Edge, Point

BISECTION_ITERATIONS = 60
MAX_ARC_STEP_DEG = 45.0  # erreur radiale ~ R * 4e-6 (90 degrés : R * 2,7e-4)
PARALLEL_EPSILON = 1e-12

type Cubic = tuple[Point, Point, Point, Point]


def quadratic_from_tangents(p0: Point, d0: Point, p1: Point, d1: Point) -> tuple[Point]:
    """Point de contrôle d'une quadratique de `p0` à `p1`, partant dans la direction `d0` et
    arrivant dans la direction `d1` : intersection des deux tangentes."""
    cross = d0[0] * d1[1] - d0[1] * d1[0]
    if abs(cross) < PARALLEL_EPSILON * math.hypot(*d0) * math.hypot(*d1):
        raise DraftingError(
            "curve-tangents-parallel", "Les tangentes de la courbe sont parallèles."
        )
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    s = (dx * d1[1] - dy * d1[0]) / cross  # p0 + s*d0 = p1 - t*d1
    t = (d0[0] * dy - d0[1] * dx) / cross
    if s <= 0 or t <= 0:
        raise DraftingError("curve-tangents-diverge", "Les tangentes de la courbe divergent.")
    return ((p0[0] + s * d0[0], p0[1] + s * d0[1]),)


def arc_cubics(center: Point, radius: float, start_deg: float, sweep_deg: float) -> list[Cubic]:
    """Arc de cercle en cubiques de 45° au plus (k = 4/3·tan(θ/4)). `sweep_deg` est signé."""
    count = max(1, math.ceil(abs(sweep_deg) / MAX_ARC_STEP_DEG - 1e-12))
    step = math.radians(sweep_deg) / count
    k = 4 / 3 * math.tan(step / 4)
    cubics: list[Cubic] = []
    for i in range(count):
        a0 = math.radians(start_deg) + i * step
        a1 = a0 + step
        c0, s0, c1, s1 = math.cos(a0), math.sin(a0), math.cos(a1), math.sin(a1)
        cubics.append(
            (
                (center[0] + radius * c0, center[1] + radius * s0),
                (center[0] + radius * (c0 - k * s0), center[1] + radius * (s0 + k * c0)),
                (center[0] + radius * (c1 + k * s1), center[1] + radius * (s1 - k * c1)),
                (center[0] + radius * c1, center[1] + radius * s1),
            )
        )
    return cubics


def _control_polygon(edge: Edge) -> tuple[Point, ...]:
    return (edge.start, *edge.controls, edge.end)


def _split_polygon(points: tuple[Point, ...], t: float) -> tuple[tuple[Point, ...], ...]:
    """Subdivision de De Casteljau : polygones de contrôle de [0, t] et de [t, 1]."""
    left = [points[0]]
    right = [points[-1]]
    current = list(points)
    while len(current) > 1:
        current = [
            ((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]) for a, b in pairwise(current)
        ]
        left.append(current[0])
        right.append(current[-1])
    return tuple(left), tuple(reversed(right))


def _piece(edge_id: str, polygon: tuple[Point, ...], like: Edge) -> Edge:
    return Edge(edge_id, polygon[0], polygon[-1], like.role, polygon[1:-1])


def _parameter_at_length(edge: Edge, length: float) -> float:
    lo, hi = 0.0, 1.0
    polygon = _control_polygon(edge)
    for _ in range(BISECTION_ITERATIONS):
        mid = (lo + hi) / 2
        head = _piece("_", _split_polygon(polygon, mid)[0], edge)
        if edge_length(head) < length:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def _check_length(edge: Edge, length: float) -> None:
    if not 0 <= length <= edge_length(edge):
        raise ValueError(f"Longueur {length} hors du bord {edge.id}")


def point_at_length(edge: Edge, length: float) -> Point:
    """Point du bord à `length` mm de son début, le long du bord."""
    _check_length(edge, length)
    if not edge.controls:
        ratio = length / edge_length(edge)
        return (
            edge.start[0] + ratio * (edge.end[0] - edge.start[0]),
            edge.start[1] + ratio * (edge.end[1] - edge.start[1]),
        )
    return bezier_point(_control_polygon(edge), _parameter_at_length(edge, length))


def split_edge_at_length(edge: Edge, length: float, ids: tuple[str, str]) -> tuple[Edge, Edge]:
    """Coupe un bord à `length` mm de son début ; les deux morceaux gardent le rôle du bord."""
    _check_length(edge, length)
    t = length / edge_length(edge) if not edge.controls else _parameter_at_length(edge, length)
    left, right = _split_polygon(_control_polygon(edge), t)
    return _piece(ids[0], left, edge), _piece(ids[1], right, edge)

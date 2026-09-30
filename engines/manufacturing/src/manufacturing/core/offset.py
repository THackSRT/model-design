"""Décalage d'un contour fermé, bord par bord, vers l'extérieur (valeurs de couture)."""

from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise

from manufacturing.core.errors import CUT_LINE_SELF_INTERSECTS, ManufacturingError
from manufacturing.core.geometry import (
    EPSILON,
    dedupe,
    distance,
    is_simple,
    point_in_polygon,
    segment_intersection,
    signed_area,
)
from manufacturing.core.model import Point

PARALLEL_SINE = 0.02  # |sin| en dessous duquel deux bords sont presque parallèles
MITER_LIMIT_FACTOR = 3.0
MITER_LIMIT_FLOOR_MM = 3.0
MIN_BISECTOR_COSINE = 0.25  # borne l'allongement d'un point intérieur de courbe


@dataclass(frozen=True)
class _Side:
    """Un bord aplati (sans point double) avec ses directions, normales extérieures et sa valeur."""

    points: list[Point]
    allowance: float
    dirs: list[Point]
    normals: list[Point]

    def shifted(self, index: int) -> tuple[Point, Point]:
        """Segment `index` décalé de la valeur du bord."""
        n, a = self.normals[index], self.allowance
        p, q = self.points[index], self.points[index + 1]
        return (p[0] + n[0] * a, p[1] + n[1] * a), (q[0] + n[0] * a, q[1] + n[1] * a)


def _make_side(points: Sequence[Point], allowance: float, sign: float) -> _Side:
    pts = dedupe(points)
    dirs: list[Point] = []
    normals: list[Point] = []
    for p, q in pairwise(pts):
        length = distance(p, q)
        d = ((q[0] - p[0]) / length, (q[1] - p[1]) / length)
        dirs.append(d)
        normals.append((sign * d[1], -sign * d[0]))
    return _Side(pts, allowance, dirs, normals)


def _interior_points(side: _Side) -> list[Point]:
    """Points intérieurs d'une courbe, décalés selon la bissectrice des normales voisines."""
    out: list[Point] = []
    for i in range(1, len(side.points) - 1):
        n1, n2 = side.normals[i - 1], side.normals[i]
        bx, by = n1[0] + n2[0], n1[1] + n2[1]
        norm = (bx * bx + by * by) ** 0.5
        if norm < EPSILON:
            ux, uy, cos = n1[0], n1[1], 1.0
        else:
            ux, uy = bx / norm, by / norm
            cos = max(ux * n1[0] + uy * n1[1], MIN_BISECTOR_COSINE)
        p, a = side.points[i], side.allowance
        out.append((p[0] + ux * a / cos, p[1] + uy * a / cos))
    return out


def _cross(a: Point, b: Point) -> float:
    return a[0] * b[1] - a[1] * b[0]


def _along(a: Point, b: Point, d: Point) -> float:
    """Progression de a vers b dans la direction d (négative : le point est en arrière)."""
    return (b[0] - a[0]) * d[0] + (b[1] - a[1]) * d[1]


def _junction(prev: _Side, nxt: _Side, bevel: bool = False) -> tuple[list[Point], list[Point]]:
    """Jonction de deux bords : (fin du précédent, début du suivant), miter ou biseau."""
    vertex = nxt.points[0]
    d1, d2 = prev.dirs[-1], nxt.dirs[0]
    p1, q1 = prev.shifted(len(prev.dirs) - 1)
    p2, q2 = nxt.shifted(0)
    if bevel:
        return [q1], [p2]
    turn = abs(_cross(d1, d2))
    same = abs(prev.allowance - nxt.allowance) < 1e-6
    if turn < PARALLEL_SINE and same and d1[0] * d2[0] + d1[1] * d2[1] > 0:
        n1, n2 = prev.normals[-1], nxt.normals[0]
        bx, by = n1[0] + n2[0], n1[1] + n2[1]
        norm = (bx * bx + by * by) ** 0.5
        a = nxt.allowance
        point = (vertex[0] + bx / norm * a, vertex[1] + by / norm * a)
        return [point], [point]
    if turn >= PARALLEL_SINE:
        t = _cross((p2[0] - p1[0], p2[1] - p1[1]), d2) / _cross(d1, d2)
        x = (p1[0] + d1[0] * t, p1[1] + d1[1] * t)
        limit = MITER_LIMIT_FACTOR * max(prev.allowance, nxt.allowance, MITER_LIMIT_FLOOR_MM)
        sound = _along(p1, x, d1) >= -EPSILON and _along(x, q2, d2) >= -EPSILON
        if sound and distance(x, vertex) <= limit:
            return [x], [x]
    return [q1], [p2]


def _first_crossing(pts: list[Point]) -> tuple[int, int, Point] | None:
    for i in range(len(pts) - 3):
        for j in range(i + 2, len(pts) - 1):
            x = segment_intersection(pts[i], pts[i + 1], pts[j], pts[j + 1])
            if x is not None:
                return i, j, x
    return None


def _remove_loops(chain: list[Point]) -> list[Point]:
    """Supprime les boucles locales (segments non voisins qui se croisent), garde le croisement."""
    pts = list(chain)
    for _ in range(len(pts)):
        found = _first_crossing(pts)
        if found is None:
            break
        i, j, x = found
        pts = [*pts[: i + 1], x, *pts[j + 1 :]]
    return pts


def _edge_chain(side: _Side, start: list[Point], end: list[Point]) -> list[Point]:
    chain = [*start, *_interior_points(side), *end]
    return _remove_loops(chain) if side.allowance > 0 else chain


def _check_cut_line(polygon: list[Point], seam_points: list[Point]) -> None:
    if (
        len(polygon) < 3
        or not is_simple(polygon)
        or not all(point_in_polygon(p, polygon) for p in seam_points)
    ):
        raise ManufacturingError(
            CUT_LINE_SELF_INTERSECTS, "la ligne de coupe se croise ou ne contient pas la couture"
        )


def _inverted(side: _Side, start: Point, end: Point) -> bool:
    """Vrai si les jonctions ont retourné le bord : sa fin passe avant son début."""
    chord = (side.points[-1][0] - side.points[0][0], side.points[-1][1] - side.points[0][1])
    return _along(start, end, chord) < -EPSILON


def _junctions(sides: list[_Side]) -> list[tuple[list[Point], list[Point]]]:
    """Jonctions de tous les sommets ; un bord retourné passe ses deux jonctions en biseau."""
    n = len(sides)
    bevels: set[int] = set()
    for _ in range(n + 1):
        joins = [_junction(sides[i - 1], sides[i], i in bevels) for i in range(n)]
        bad = {
            i
            for i, side in enumerate(sides)
            if _inverted(side, joins[i][1][0], joins[(i + 1) % n][0][-1])
        }
        forced = {j for i in bad for j in (i, (i + 1) % n)}
        if forced <= bevels:
            break
        bevels |= forced
    return joins


def offset_contour(edges: Sequence[Sequence[Point]], allowances: Sequence[float]) -> list[Point]:
    """Ligne de coupe (sens trigonométrique) d'un contour fermé de bords aplatis.

    `edges[i]` est la polyligne du bord i, `allowances[i]` sa valeur en mm. Lève
    `cut-line-self-intersects` si le résultat n'est pas un polygone simple contenant la couture.
    """
    flat = [p for e in edges for p in e[:-1]]
    sign = 1.0 if signed_area(flat) > 0 else -1.0
    made = (_make_side(e, a, sign) for e, a in zip(edges, allowances, strict=True))
    sides = [s for s in made if s.dirs]
    joins = _junctions(sides)
    cut: list[Point] = []
    for i, side in enumerate(sides):
        cut.extend(_edge_chain(side, joins[i][1], joins[(i + 1) % len(sides)][0]))
    polygon = dedupe(cut, closed=True)
    if sign < 0:
        polygon.reverse()
    _check_cut_line(polygon, flat)
    return polygon

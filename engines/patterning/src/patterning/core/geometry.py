"""Géométrie plane : longueurs de bords (droits ou Bézier), aire signée, arrondi stable."""

from itertools import pairwise

from patterning.core.model import Edge, Point

BEZIER_SAMPLES = 64
PRECISION_MM = 2  # décimales conservées en sortie : 0,01 mm


def round_point(p: Point) -> Point:
    return (round(p[0], PRECISION_MM) + 0.0, round(p[1], PRECISION_MM) + 0.0)


def _bezier_point(points: tuple[Point, ...], t: float) -> Point:
    """Algorithme de De Casteljau, quel que soit le degré."""
    current = list(points)
    while len(current) > 1:
        current = [
            ((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]) for a, b in pairwise(current)
        ]
    return current[0]


def _distance(a: Point, b: Point) -> float:
    return float(((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2) ** 0.5)


def sample_edge(edge: Edge, samples: int = BEZIER_SAMPLES) -> list[Point]:
    if not edge.controls:
        return [edge.start, edge.end]
    points = (edge.start, *edge.controls, edge.end)
    return [_bezier_point(points, i / samples) for i in range(samples + 1)]


def edge_length(edge: Edge) -> float:
    pts = sample_edge(edge)
    return sum(_distance(a, b) for a, b in pairwise(pts))


def signed_area(edges: tuple[Edge, ...]) -> float:
    """Aire signée du contour (positive dans le sens trigonométrique)."""
    pts = [p for e in edges for p in sample_edge(e)[:-1]]
    total = 0.0
    for (x1, y1), (x2, y2) in zip(pts, pts[1:] + pts[:1], strict=False):
        total += x1 * y2 - x2 * y1
    return total / 2

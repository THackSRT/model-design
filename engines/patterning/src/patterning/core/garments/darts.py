"""Briques communes aux jupes, au pantalon et au corsage : demi-pièces, pinces, bords de taille.

Code propre au moteur (la conception vient de GarmentCode, voir les modules des vêtements). Une
demi-pièce va du milieu (pli ou couture dos) au côté ; ses pinces sont décrites par `Half`.
"""

from dataclasses import dataclass

from patterning.core.body import Body
from patterning.core.garments.parts import pt
from patterning.core.model import Edge, EdgeRole, Panel, Point, Seam

MIN_DART_MM = (
    2.0  # largeur minimale d'une pince : toujours présente (même topologie à toute taille)
)
FRONT_DART_DEPTH = 0.8  # profondeur des pinces, rapportée à la profondeur taille-hanches
BACK_DART_DEPTH = 0.85
OUTER_DART_DEPTH = 0.9  # la pince extérieure du dos est un peu plus courte
EDGE_MARGIN = 0.1  # un morceau cousu de la taille garde au moins 10 % de la demi-taille


@dataclass(frozen=True)
class Shape:
    """Grandeurs communes à toutes les pièces : mêmes côtés devant et dos, donc coutures justes."""

    length: float
    depth: float  # profondeur taille-hanches
    shift: float  # de combien le côté se rentre entre hanches et taille
    flare: float  # élargissement de l'ourlet au côté

    @property
    def hip_y(self) -> float:
        return self.length - self.depth


@dataclass(frozen=True)
class Half:
    """Une demi-pièce, du milieu (pli ou couture dos) au côté."""

    hip: float  # demi-largeur à la ligne des hanches
    waist: float  # demi-largeur cousue à la taille (hors pinces)
    dart_gaps: tuple[float, ...]  # morceaux cousus avant chaque pince, depuis le milieu
    dart_width: float
    dart_depths: tuple[float, ...]


def clamp(value: float, low: float, high: float) -> float:
    return min(max(value, low), high)


def front_half(body: Body, hip: float, waist: float, width: float) -> Half:
    gap = clamp(body.bust_point_width_mm / 2 - width / 2, EDGE_MARGIN * waist, 0.9 * waist)
    depths = (FRONT_DART_DEPTH * body.waist_hip_depth_mm,)
    return Half(hip, waist, (gap,), width, depths)


def back_half(body: Body, hip: float, waist: float, width: float) -> Half:
    each = width / 2
    pos = body.bum_points_mm / 2
    first = clamp(0.75 * pos - each / 2, EDGE_MARGIN * waist, 0.4 * waist)
    second = clamp(0.5 * pos - each, EDGE_MARGIN * waist, 0.35 * waist)
    inner = BACK_DART_DEPTH * body.waist_hip_depth_mm
    depths = (inner, inner * OUTER_DART_DEPTH)
    return Half(hip, waist, (first, second), each, depths)


def hip_waist_split(body: Body, waist_ease: float, hip_ease: float) -> tuple[float, ...]:
    """Demi-largeurs hanches et taille devant puis dos, aisance comprise."""
    hip = body.hip_girth_mm + hip_ease
    waist = body.waist_girth_mm + waist_ease
    back_hip = body.hip_back_width_mm / body.hip_girth_mm
    back_waist = body.waist_back_width_mm / body.waist_girth_mm
    return (
        hip * (1 - back_hip) / 2,
        waist * (1 - back_waist) / 2,
        hip * back_hip / 2,
        waist * back_waist / 2,
    )


def dart_spans(half: Half) -> list[tuple[float, float]]:
    """Début et fin de chaque pince, en abscisse depuis le milieu (la plus proche d'abord)."""
    spans: list[tuple[float, float]] = []
    x = 0.0
    for gap in half.dart_gaps:
        spans.append((x + gap, x + gap + half.dart_width))
        x += gap + half.dart_width
    return spans


def waist_edges(half: Half, top: float, start: Point) -> tuple[Edge, ...]:
    """Du côté de la taille au milieu : morceaux cousus et pinces (la plus extérieure d'abord)."""
    edges: list[Edge] = []
    current = start
    sewn = 0
    for index, (begin, end) in reversed(list(enumerate(dart_spans(half), 1))):
        right, left = pt(end, top), pt(begin, top)
        apex = pt((begin + end) / 2, top - half.dart_depths[index - 1])
        sewn += 1
        edges.append(Edge(f"waist-{sewn}", current, right, EdgeRole.WAISTLINE))
        edges.append(Edge(f"dart-{index}-right", right, apex, EdgeRole.SEAM))
        edges.append(Edge(f"dart-{index}-left", apex, left, EdgeRole.SEAM))
        current = left
    edges.append(Edge(f"waist-{sewn + 1}", current, pt(0.0, top), EdgeRole.WAISTLINE))
    return tuple(edges)


def rising_edges(half: Half, base: float, end: Point, role: EdgeRole) -> tuple[Edge, ...]:
    """Du milieu au côté, sur le bord du bas : morceaux cousus (`hem-n`) et pinces qui montent."""
    edges: list[Edge] = []
    current = pt(0.0, base)
    for index, (begin, finish) in enumerate(dart_spans(half), 1):
        left, right = pt(begin, base), pt(finish, base)
        apex = pt((begin + finish) / 2, base + half.dart_depths[index - 1])
        edges.append(Edge(f"hem-{index}", current, left, role))
        edges.append(Edge(f"dart-{index}-left", left, apex, EdgeRole.SEAM))
        edges.append(Edge(f"dart-{index}-right", apex, right, EdgeRole.SEAM))
        current = right
    edges.append(Edge(f"hem-{len(half.dart_gaps) + 1}", current, end, role))
    return tuple(edges)


def dart_seams(panel: Panel) -> list[Seam]:
    return [
        Seam(
            f"{panel.id}-dart-{edge.id.split('-')[1]}",
            (panel.id, edge.id),
            (panel.id, edge.id.replace("-right", "-left")),
        )
        for edge in panel.edges
        if edge.id.startswith("dart-") and edge.id.endswith("-right")
    ]

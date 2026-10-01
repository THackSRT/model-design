"""Jupe droite à pinces : devant au pli, dos en deux pièces (couture milieu dos).

Réécriture ciblée, en Python pur et en mm, de GarmentCode (licence MIT, commit d449629) :
`assets/garment_programs/skirt_paneled.py` (`FittedSkirtPanel`, `PencilSkirt`) et `eval_rise` de
`base_classes.py`. Mêmes niveaux taille-hanches, même partage de l'écart entre hanches et taille
(pente de hanche du corps puis pinces), pince simple par demi-devant et double par demi-dos.
Différences voulues (ADR 0010) : côtés égalisés par construction (même pente et même profondeur
devant et dos, sans la rallonge de 5 % du dos), courbes sans optimisation numérique (quadratique à
tangente verticale sur la hanche), aisances de taille et de hanches en paramètres.
Noms GarmentCode : `flare` ~ `hem_flare_mm` ; `rise` est fixé à 1 (jupe à la taille).
"""

import math
from collections.abc import Mapping
from dataclasses import dataclass

from patterning.core.body import Body
from patterning.core.errors import DraftingError
from patterning.core.garments.parts import (
    mirror_panel,
    notch_at_end,
    notch_at_start,
    pt,
    vertical_grainline,
)
from patterning.core.model import Edge, EdgeRole, Panel, Pattern, Point, Seam

MIN_SKIRT_BELOW_HIP_MM = 50
MIN_DART_MM = (
    2.0  # largeur minimale d'une pince : toujours présente (même topologie à toute taille)
)
SIDE_CONTROL_RISE = 0.5  # point de contrôle du côté galbé : à mi-hauteur taille-hanches
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


def _clamp(value: float, low: float, high: float) -> float:
    return min(max(value, low), high)


def _front_half(body: Body, hip: float, waist: float, width: float) -> Half:
    gap = _clamp(body.bust_point_width_mm / 2 - width / 2, EDGE_MARGIN * waist, 0.9 * waist)
    depths = (FRONT_DART_DEPTH * body.waist_hip_depth_mm,)
    return Half(hip, waist, (gap,), width, depths)


def _back_half(body: Body, hip: float, waist: float, width: float) -> Half:
    each = width / 2
    pos = body.bum_points_mm / 2
    first = _clamp(0.75 * pos - each / 2, EDGE_MARGIN * waist, 0.4 * waist)
    second = _clamp(0.5 * pos - each, EDGE_MARGIN * waist, 0.35 * waist)
    inner = BACK_DART_DEPTH * body.waist_hip_depth_mm
    depths = (inner, inner * OUTER_DART_DEPTH)
    return Half(hip, waist, (first, second), each, depths)


def _hip_waist_split(body: Body, waist_ease: float, hip_ease: float) -> tuple[float, ...]:
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


def _check_length(length: float, depth: float) -> None:
    if length < depth + MIN_SKIRT_BELOW_HIP_MM:
        raise DraftingError(
            "skirt-shorter-than-hip-depth",
            "La longueur doit dépasser la ligne des hanches "
            f"d'au moins {MIN_SKIRT_BELOW_HIP_MM} mm.",
        )


def _side_edges(half: Half, shape: Shape) -> tuple[Edge, Edge, Edge]:
    """Ourlet, côté bas (droit) et côté haut (galbé) : de (0, 0) au côté de la taille."""
    hip = pt(half.hip, shape.hip_y)
    hem_end = pt(half.hip + shape.flare, 0.0)
    waist_side = pt(half.hip - shape.shift, shape.length)
    control = pt(half.hip, shape.hip_y + SIDE_CONTROL_RISE * shape.depth)
    return (
        Edge("hem", pt(0.0, 0.0), hem_end, EdgeRole.HEM),
        Edge("side-lower", hem_end, hip, EdgeRole.SEAM),
        Edge("side-upper", hip, waist_side, EdgeRole.SEAM, (control,)),
    )


def _dart_spans(half: Half) -> list[tuple[float, float]]:
    """Début et fin de chaque pince, en abscisse depuis le milieu (la plus proche d'abord)."""
    spans: list[tuple[float, float]] = []
    x = 0.0
    for gap in half.dart_gaps:
        spans.append((x + gap, x + gap + half.dart_width))
        x += gap + half.dart_width
    return spans


def _waist_edges(half: Half, top: float, start: Point) -> tuple[Edge, ...]:
    """Du côté de la taille au milieu : morceaux cousus et pinces (la plus extérieure d'abord)."""
    edges: list[Edge] = []
    current = start
    sewn = 0
    for index, (begin, end) in reversed(list(enumerate(_dart_spans(half), 1))):
        right, left = pt(end, top), pt(begin, top)
        apex = pt((begin + end) / 2, top - half.dart_depths[index - 1])
        sewn += 1
        edges.append(Edge(f"waist-{sewn}", current, right, EdgeRole.WAISTLINE))
        edges.append(Edge(f"dart-{index}-right", right, apex, EdgeRole.SEAM))
        edges.append(Edge(f"dart-{index}-left", apex, left, EdgeRole.SEAM))
        current = left
    edges.append(Edge(f"waist-{sewn + 1}", current, pt(0.0, top), EdgeRole.WAISTLINE))
    return tuple(edges)


def _half_panel(panel_id: str, name: str, half: Half, shape: Shape) -> Panel:
    front = panel_id == "front"
    hem, lower, upper = _side_edges(half, shape)
    waist = _waist_edges(half, shape.length, upper.end)
    middle = Edge(
        "fold" if front else "center-back",
        waist[-1].end,
        hem.start,
        EdgeRole.FOLD if front else EdgeRole.SEAM,
    )
    return Panel(
        panel_id,
        name,
        (hem, lower, upper, *waist, middle),
        vertical_grainline((half.hip + shape.flare) / 2, shape.length),
        cut_on_fold=front,
        notches=(notch_at_start(upper), notch_at_end(waist[-1])),
    )


def _dart_seams(panel: Panel) -> list[Seam]:
    return [
        Seam(
            f"{panel.id}-dart-{edge.id.split('-')[1]}",
            (panel.id, edge.id),
            (panel.id, edge.id.replace("-right", "-left")),
        )
        for edge in panel.edges
        if edge.id.startswith("dart-") and edge.id.endswith("-right")
    ]


def _seams(panels: tuple[Panel, ...]) -> tuple[Seam, ...]:
    seams = [
        Seam(f"side-{part}-{side}", ("front", f"side-{part}"), (f"back-{side}", f"side-{part}"))
        for side in ("right", "left")
        for part in ("lower", "upper")
    ]
    seams.append(Seam("center-back", ("back-right", "center-back"), ("back-left", "center-back")))
    for panel in panels:
        seams.extend(_dart_seams(panel))
    return tuple(seams)


def draft_straight_skirt(body: Body, params: Mapping[str, float]) -> Pattern:
    length = float(params["length_mm"])
    depth = body.waist_hip_depth_mm
    _check_length(length, depth)
    front_hip, front_waist, back_hip, back_waist = _hip_waist_split(
        body, params.get("waist_ease_mm", 10), params.get("hip_ease_mm", 40)
    )
    slope = math.tan(math.radians(body.hip_inclination_deg)) * depth
    # côté commun ; il laisse au moins la pince minimale devant et dos (taille cousue exacte)
    shift = min(slope, front_hip - front_waist - MIN_DART_MM, back_hip - back_waist - MIN_DART_MM)
    shape = Shape(length, depth, shift, params.get("hem_flare_mm", 0) / 4)
    front = _front_half(body, front_hip, front_waist, front_hip - front_waist - shift)
    back = _back_half(body, back_hip, back_waist, back_hip - back_waist - shift)
    back_right = _half_panel("back-right", "Dos droit", back, shape)
    panels = (
        _half_panel("front", "Devant", front, shape),
        back_right,
        mirror_panel(back_right, "back-left", "Dos gauche"),
    )
    return Pattern("straight-skirt", panels, _seams(panels))

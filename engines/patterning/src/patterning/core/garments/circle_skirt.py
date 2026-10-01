"""Jupe cercle (ou fraction de cercle), avec ceinture droite facultative.

Réécriture ciblée, en Python pur et en mm, de GarmentCode (licence MIT, commit d449629) :
`assets/garment_programs/circle_skirt.py` (`CircleArcPanel.from_w_length_suns`, `SkirtCircle`) et
`assets/garment_programs/bands.py` (`StraightWB`). Devant et dos valent chacun la moitié de la
fraction de cercle ; le rayon de taille donne un arc de taille égal à la moitié du tour de taille
avec aisance. Différence voulue (ADR 0010) : la ceinture suit la taille de la jupe (GarmentCode
la fait de 425,7 mm pour 315,0 mm), donc des bords cousus de même longueur et aucune fronce.
Noms GarmentCode : `circle_fraction` ~ `suns`.
"""

import math
from collections.abc import Mapping
from dataclasses import dataclass

from patterning.core.body import Body
from patterning.core.curves import arc_cubics
from patterning.core.garments.parts import notch_at_middle, pt, vertical_grainline
from patterning.core.model import Edge, EdgeRole, Panel, Pattern, Point, Seam


@dataclass(frozen=True)
class Circle:
    """Un devant ou un dos : secteur d'anneau, de rayon `radius` à `radius + length`."""

    radius: float  # rayon de taille
    length: float  # de la taille à l'ourlet, le long du rayon
    angle_deg: float  # ouverture du secteur


@dataclass(frozen=True)
class Arc:
    center: Point
    radius: float
    start_deg: float
    sweep_deg: float


@dataclass(frozen=True)
class Band:
    width: float
    height: float
    segments: int  # nombre de bords du bas, égal à celui de l'arc de taille


def _arc_chain(prefix: str, arc: Arc, role: EdgeRole) -> tuple[Edge, ...]:
    """Arc en cubiques bout à bout : chaque départ est l'arrivée arrondie du bord précédent."""
    cubics = arc_cubics(arc.center, arc.radius, arc.start_deg, arc.sweep_deg)
    current = pt(*cubics[0][0])
    edges: list[Edge] = []
    for number, (_, control_a, control_b, end_point) in enumerate(cubics, 1):
        end = pt(*end_point)
        controls = (pt(*control_a), pt(*control_b))
        edges.append(Edge(f"{prefix}-{number}", current, end, role, controls))
        current = end
    return tuple(edges)


def _skirt_panel(panel_id: str, name: str, circle: Circle, waist_role: EdgeRole) -> Panel:
    outer = circle.radius + circle.length
    half = math.radians(circle.angle_deg / 2)
    center = pt(outer * math.sin(half), outer)
    start = -90.0 - circle.angle_deg / 2  # angle de l'arc de l'ourlet, de gauche à droite
    hem = _arc_chain("hem", Arc(center, outer, start, circle.angle_deg), EdgeRole.HEM)
    top = Arc(center, circle.radius, start + circle.angle_deg, -circle.angle_deg)
    waist = _arc_chain("waist", top, waist_role)
    edges = (
        *hem,
        Edge("side-right", hem[-1].end, waist[0].start, EdgeRole.SEAM),
        *waist,
        Edge("side-left", waist[-1].end, hem[0].start, EdgeRole.SEAM),
    )
    return Panel(
        panel_id,
        name,
        edges,
        vertical_grainline(center[0], circle.length),
        notches=(notch_at_middle(waist),),
    )


def _band(panel_id: str, name: str, band: Band) -> Panel:
    """Ceinture droite : le bas est coupé en autant de bords que l'arc de taille qu'il épouse."""
    width, height, segments = band.width, band.height, band.segments
    xs = [width * i / segments for i in range(segments)] + [width]
    bottom = [
        Edge(f"bottom-{segments - i}", pt(xs[i], 0.0), pt(xs[i + 1], 0.0), EdgeRole.SEAM)
        for i in range(segments)
    ]
    edges = (
        *bottom,
        Edge("side-right", pt(width, 0.0), pt(width, height), EdgeRole.SEAM),
        Edge("top", pt(width, height), pt(0.0, height), EdgeRole.WAISTLINE),
        Edge("side-left", pt(0.0, height), pt(0.0, 0.0), EdgeRole.SEAM),
    )
    grain = (pt(width * 0.1, height / 2), pt(width * 0.9, height / 2))
    return Panel(panel_id, name, edges, grain)


def _band_seams(segments: int) -> tuple[Seam, ...]:
    seams = [
        Seam(f"{side}-waistband-{i}", (side, f"waist-{i}"), (f"waistband-{side}", f"bottom-{i}"))
        for side in ("front", "back")
        for i in range(1, segments + 1)
    ]
    seams.append(
        Seam(
            "waistband-side-right",
            ("waistband-front", "side-right"),
            ("waistband-back", "side-left"),
        )
    )
    seams.append(
        Seam(
            "waistband-side-left",
            ("waistband-front", "side-left"),
            ("waistband-back", "side-right"),
        )
    )
    return tuple(seams)


def draft_circle_skirt(body: Body, params: Mapping[str, float]) -> Pattern:
    fraction = params.get("circle_fraction", 1.0)
    band = params.get("waistband_width_mm", 0)
    waist = body.waist_girth_mm + params.get("waist_ease_mm", 10)
    angle = 180.0 * fraction  # chaque pièce vaut la moitié de la fraction de cercle
    circle = Circle(waist / (2 * math.pi * fraction), float(params["length_mm"]), angle)
    role = EdgeRole.SEAM if band else EdgeRole.WAISTLINE
    panels = [
        _skirt_panel("front", "Devant", circle, role),
        _skirt_panel("back", "Dos", circle, role),
    ]
    seams = [
        Seam("side-right", ("front", "side-right"), ("back", "side-left")),
        Seam("side-left", ("front", "side-left"), ("back", "side-right")),
    ]
    if band:
        segments = sum(1 for e in panels[0].edges if e.id.startswith("waist-"))
        shape = Band(waist / 2, band, segments)
        panels.append(_band("waistband-front", "Ceinture devant", shape))
        panels.append(_band("waistband-back", "Ceinture dos", shape))
        seams.extend(_band_seams(segments))
    return Pattern("circle-skirt", tuple(panels), tuple(seams))

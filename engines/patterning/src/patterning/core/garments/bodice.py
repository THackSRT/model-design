"""Corsage ajusté à pinces, avec ou sans manches montées : devant au pli, dos en deux pièces.

Conception d'après GarmentCode (licence MIT, commit d449629) :
`assets/garment_programs/bodice.py` (`BodiceFrontHalf`, `BodiceBackHalf`, `BodiceHalf`),
`tee.py`, `collars.py` (`CircleNeckHalf`) ; réécriture en Python pur et en mm, sans code copié.
Repris : pince de poitrine au côté, pince de taille verticale (une devant, une au dos), pente
d'épaule du corps, profondeur d'emmanchure, encolure ronde.
Différences voulues (ADR 0010) : épaules et côtés cousus à la même longueur par construction
(GarmentCode laisse jusqu'à 3,7 mm) ; devant et dos ont la même demi-largeur à la poitrine, donc
la même emmanchure (l'embu de manche se répartit sans valeur négative) ; la pince de poitrine a
pour largeur l'écart entre les longueurs taille devant et taille dos (le devant est plus haut de
cette valeur au-dessus de la pince).
Repères : y = 0 à la taille, y > 0 vers l'épaule ; le bas de la pièce est à -lengthBelowWaistMm.
"""

import math
from collections.abc import Mapping
from dataclasses import dataclass, replace

from patterning.core.body import Body
from patterning.core.errors import DraftingError
from patterning.core.garments.darts import (
    EDGE_MARGIN,
    MIN_DART_MM,
    Half,
    clamp,
    dart_seams,
    front_half,
    rising_edges,
)
from patterning.core.garments.parts import mirror_panel, pt, vertical_grainline
from patterning.core.garments.sleeve import NOTCH_SHARE, SleeveSpec, draft_sleeve
from patterning.core.geometry import edge_length
from patterning.core.model import Edge, EdgeRole, Notch, Panel, Pattern, Seam

MIN_BUST_DART_MM = 4.0
MAX_BUST_DART_MM = 100.0
MIN_ARMHOLE_MM = 25.0  # largeur minimale de l'emmanchure (côté - pointe d'épaule)
MIN_SHOULDER_X_MM = 40.0
NECK_SHARE = 0.6  # demi-encolure au plus égale à 60 % de la demi-épaule
TAPER_SHARE = 0.4  # part de l'écart poitrine-taille reprise par le côté (le reste : pinces)
BUST_CLEARANCE_MM = 25.0  # la pince de taille s'arrête 25 mm sous la pointe de poitrine
BACK_DART_RISE = 0.8  # hauteur de la pince dos / hauteur de la ligne de poitrine
NATURAL_FRONT_DROP = 0.6  # creux naturel de l'encolure / demi-encolure (devant)
NATURAL_BACK_DROP = 0.25
ARMHOLE_BULGE = 0.4
MIN_BUST_HEIGHT_MM = 40.0
MIN_UNDERARM_GAP_MM = 20.0
SLEEVE_HEM_EASE_MM = 40.0
FRONT_DART_CLEARANCE = 0.12  # droit fil à 12 % de la demi-largeur depuis le milieu


@dataclass(frozen=True)
class Frame:
    """Grandeurs communes au devant et au dos : mêmes côtés, mêmes épaules, mêmes emmanchures."""

    xs: float  # demi-largeur à la ligne de poitrine
    taper: float  # de combien le côté se rentre entre poitrine et taille
    below: float  # longueur sous la taille
    dart: float  # largeur de la pince de poitrine
    top: float  # hauteur du point cou-épaule au dos
    nw: float  # demi-encolure
    sx: float  # abscisse de la pointe d'épaule
    y_s: float  # hauteur de la pointe d'épaule au dos
    y_u: float  # hauteur de l'aisselle au dos
    y_b: float  # hauteur de la ligne de poitrine au dos (bas de la pince de poitrine devant)
    apex_x: float
    front_drop: float
    back_drop: float
    sleeved: bool

    @property
    def xw(self) -> float:
        return self.xs - self.taper

    @property
    def y_a(self) -> float:
        return self.y_b + self.dart / 2


def _inconsistent(name: str, why: str) -> DraftingError:
    return DraftingError(
        "inconsistent-measurements",
        f"Les mesures données et estimées sont incohérentes : {name} {why}.",
    )


def _levels(body: Body, xs: float) -> tuple[float, float, float, float, float, float]:
    """Largeur de pince, abscisses (épaule, encolure) et hauteurs (épaule, aisselle, poitrine)."""
    dart = body.front_waist_length_mm - body.back_waist_length_mm
    if dart > MAX_BUST_DART_MM:
        raise _inconsistent("front_waist_length_mm", "est trop grande devant back_waist_length_mm")
    dart = max(dart, MIN_BUST_DART_MM)
    top = body.back_waist_length_mm
    sx = min(body.shoulder_width_mm / 2, xs - MIN_ARMHOLE_MM)
    if sx < MIN_SHOULDER_X_MM:
        raise _inconsistent("bust_girth_mm", "est trop petite pour les épaules")
    nw = min(body.neck_width_mm / 2, NECK_SHARE * sx)
    y_s = top - (sx - nw) * math.tan(math.radians(body.shoulder_incl_deg))
    y_u = y_s - body.armscye_depth_mm
    y_b = top + dart - body.neck_shoulder_to_bust_point_mm - dart / 2
    if y_b < MIN_BUST_HEIGHT_MM or y_u - y_b < MIN_UNDERARM_GAP_MM:
        raise _inconsistent(
            "neck_shoulder_to_bust_point_mm", "ne place pas la poitrine sous l'aisselle"
        )
    return dart, sx, nw, y_s, y_u, y_b


def _frame(body: Body, params: Mapping[str, float]) -> Frame:
    xs = (body.bust_girth_mm + params.get("bust_ease_mm", 60)) / 4
    dart, sx, nw, y_s, y_u, y_b = _levels(body, xs)
    waist = body.waist_girth_mm + params.get("waist_ease_mm", 40)
    share = body.waist_back_width_mm / body.waist_girth_mm
    widths = (waist * (1 - share) / 2, waist * share / 2)
    taper = min(TAPER_SHARE * (xs - max(widths)), *(xs - w - MIN_DART_MM for w in widths))
    front_drop = NATURAL_FRONT_DROP * nw + params.get("front_neck_depth_mm", 0)
    back_drop = NATURAL_BACK_DROP * nw + params.get("back_neck_depth_mm", 0)
    top = body.back_waist_length_mm
    if top + dart - front_drop < y_b + dart / 2 or top - back_drop < y_u:
        raise DraftingError(
            "neckline-too-deep", "L'encolure ne peut pas descendre sous la ligne de poitrine."
        )
    return Frame(
        xs, taper, params.get("length_below_waist_mm", 0), dart, top, nw, sx, y_s, y_u, y_b,
        clamp(body.bust_point_width_mm / 2, 0.3 * xs, 0.7 * xs), front_drop, back_drop,
        "sleeve_length_mm" in params,
    )  # fmt: skip


def _halves(body: Body, params: Mapping[str, float], f: Frame) -> tuple[Half, Half]:
    """Demi-devant et demi-dos : une pince de taille chacun (jambes au bas de la pièce)."""
    waist = body.waist_girth_mm + params.get("waist_ease_mm", 40)
    share = body.waist_back_width_mm / body.waist_girth_mm
    fw, bw = waist * (1 - share) / 2, waist * share / 2
    front = front_half(body, f.xw, fw, f.xw - fw)
    front = replace(front, dart_depths=(f.y_a - BUST_CLEARANCE_MM + f.below,))
    gap = clamp(bw / 2, EDGE_MARGIN * bw, 0.9 * bw)
    back = Half(f.xw, bw, (gap,), f.xw - bw, (BACK_DART_RISE * f.y_b + f.below,))
    return front, back


def _lower_edges(f: Frame, front: bool, half: Half) -> tuple[Edge, ...]:
    """Bas (`hem-n`, pinces), côté sous la taille, côté jusqu'à la poitrine, pince de poitrine."""
    base, seam = -f.below, EdgeRole.SEAM
    edges = list(rising_edges(half, base, pt(f.xw, base), EdgeRole.HEM))
    if f.below > 0:
        edges.append(Edge("side-below", pt(f.xw, base), pt(f.xw, 0.0), seam))
    bust = pt(f.xs, f.y_b)
    edges.append(Edge("side-lower", pt(f.xw, 0.0), bust, seam))
    start, rise = bust, 0.0
    if front:
        start, rise = pt(f.xs, f.y_b + f.dart), f.dart
        apex = pt(f.apex_x, f.y_a)
        edges.append(Edge("bust-dart-lower", bust, apex, seam))
        edges.append(Edge("bust-dart-upper", apex, start, seam))
    edges.append(Edge("side-upper", start, pt(f.xs, f.y_u + rise), seam))
    return tuple(edges)


def _upper_edges(f: Frame, front: bool) -> tuple[Edge, ...]:
    """Emmanchure, épaule, encolure : de l'aisselle au milieu."""
    rise = f.dart if front else 0.0
    under, shoulder = pt(f.xs, f.y_u + rise), pt(f.sx, f.y_s + rise)
    neck = pt(f.nw, f.top + rise)
    center = pt(0.0, f.top + rise - (f.front_drop if front else f.back_drop))
    bulge = pt(f.sx - ARMHOLE_BULGE * (f.xs - f.sx), f.y_u + rise)
    role = EdgeRole.SEAM if f.sleeved else EdgeRole.OPENING
    return (
        Edge("armhole", under, shoulder, role, (bulge,)),
        Edge("shoulder", shoulder, neck, EdgeRole.SEAM),
        Edge("neck", neck, center, EdgeRole.OPENING, (pt(f.nw, center[1]),)),
    )


def _armhole_notches(front: bool, armhole: Edge) -> tuple[Notch, ...]:
    length = edge_length(armhole)
    notches = [Notch("armhole", round(NOTCH_SHARE * length, 2), 1 if front else 2)]
    if front:  # le sommet de la tête de manche tombe sur la pointe d'épaule
        notches.append(Notch("armhole", round(length, 2)))
    return tuple(notches)


def _panel(panel_id: str, name: str, f: Frame, half: Half) -> Panel:
    front = panel_id == "front"
    lower, upper = _lower_edges(f, front, half), _upper_edges(f, front)
    middle = Edge(
        "fold" if front else "center-back",
        upper[-1].end,
        pt(0.0, -f.below),
        EdgeRole.FOLD if front else EdgeRole.SEAM,
    )
    return Panel(
        panel_id,
        name,
        (*lower, *upper, middle),
        vertical_grainline(FRONT_DART_CLEARANCE * f.xs, f.top),
        cut_on_fold=front,
        notches=_armhole_notches(front, upper[0]) if f.sleeved else (),
    )


def _seams(panels: tuple[Panel, ...], f: Frame) -> list[Seam]:
    parts = ["side-lower", "side-upper", "shoulder"] + (["side-below"] if f.below > 0 else [])
    seams = [
        Seam(f"{part}-{side}", ("front", part), (f"back-{side}", part))
        for side in ("right", "left")
        for part in parts
    ]
    seams.append(Seam("center-back", ("back-right", "center-back"), ("back-left", "center-back")))
    seams.append(Seam("bust-dart", ("front", "bust-dart-lower"), ("front", "bust-dart-upper")))
    for panel in panels:
        seams.extend(dart_seams(panel))
    return seams


def draft_bodice(body: Body, params: Mapping[str, float]) -> Pattern:
    frame = _frame(body, params)
    front_h, back_h = _halves(body, params, frame)
    back_right = _panel("back-right", "Dos droit", frame, back_h)
    panels = [
        _panel("front", "Devant", frame, front_h),
        back_right,
        mirror_panel(back_right, "back-left", "Dos gauche"),
    ]
    seams = _seams(tuple(panels), frame)
    if frame.sleeved:
        hem = params.get("sleeve_hem_girth_mm", body.wrist_girth_mm + SLEEVE_HEM_EASE_MM)
        spec = SleeveSpec(params["sleeve_length_mm"], params.get("sleeve_cap_ease_mm", 15), hem)
        front_arm = edge_length(panels[0].edge("armhole"))
        sleeve, sleeve_seams = draft_sleeve(
            front_arm, edge_length(back_right.edge("armhole")), spec
        )
        panels.append(sleeve)
        seams.extend(sleeve_seams)
    return Pattern("bodice", tuple(panels), tuple(seams))


def sleeve_estimates(params: Mapping[str, float]) -> tuple[str, ...]:
    """Mesures estimées utiles avec une manche : le poignet, si le tour d'ourlet n'est pas donné."""
    if "sleeve_length_mm" in params and "sleeve_hem_girth_mm" not in params:
        return ("wrist_girth_mm",)
    return ()

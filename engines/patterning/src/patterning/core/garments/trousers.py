"""Pantalon : devant et dos, gauche et droite (quatre pièces), pinces de taille.

Conception d'après GarmentCode (licence MIT, commit d449629) : `assets/garment_programs/pants.py`
(`PantPanel`, `PantsHalf`, `Pants`) ; réécriture en Python pur et en mm, sans code copié. Repris :
prolongement d'entrejambe fondé sur le tour de cuisse, un quart devant et le reste au dos, une pince
devant et deux au dos (comme la jupe droite), hauteur d'entrejambe issue du corps.
Différences voulues (ADR 0010) : côtés et entrejambe (`inseam-*`, devant contre dos de la même
jambe) cousus de même longueur par construction (GarmentCode laisse 23 mm d'écart) ; mêmes
rétrécissements de jambe devant et dos. La courbe d'entrejambe (`crotch`) fait partie de la couture
milieu, avec le montant (`rise`) : devant gauche contre devant droit, dos gauche contre dos droit ;
sa longueur n'est donc pas égalisée entre devant et dos. C'est une quadratique à tangente verticale
sur la ligne du milieu et horizontale au point d'entrejambe, dont la chute est proportionnelle au
prolongement : la fourche du dos est plus haute que celle du devant.
Sans `hemGirthMm`, la jambe est droite depuis le genou (tour de genou + aisance).
"""

from collections.abc import Mapping
from dataclasses import dataclass
from math import radians, tan

from patterning.core.body import Body
from patterning.core.errors import DraftingError
from patterning.core.garments.darts import (
    MIN_DART_MM,
    Half,
    Shape,
    back_half,
    dart_seams,
    front_half,
    hip_waist_split,
    waist_edges,
)
from patterning.core.garments.parts import mirror_panel, notch_at_end, notch_at_start, pt
from patterning.core.garments.parts import vertical_grainline as grain
from patterning.core.model import (
    BodySide,
    Edge,
    EdgeRole,
    Facing,
    Landmark,
    Panel,
    Pattern,
    Placement,
    Seam,
    Zone,
)

MIN_LEG_BELOW_CROTCH_MM = 100
MIN_RISE_MM = 30  # la fourche reste au moins à 30 mm sous la taille
MIN_HEM_PANEL_MM = 30
MIN_EXTENSION_MM = 20.0
THIGH_EASE_MM = 60.0
KNEE_EASE_MM = 60.0
FRONT_EXTENSION_SHARE = 0.25
CROTCH_DROP_FACTOR = 1.0  # chute de la courbe d'entrejambe / son prolongement
SIDE_SHARE = 0.4  # part du rétrécissement de la jambe prise sur le côté (le reste : entrejambe)
KNEE_SHARE = 0.5  # le genou est à mi-hauteur entre l'entrejambe et l'ourlet
SIDE_CONTROL_RISE = 0.5


@dataclass(frozen=True)
class Leg:
    """Grandeurs communes au devant et au dos : côtés et jambes identiques, coutures justes."""

    shape: Shape
    crotch_y: float
    side_hem: float  # rétrécissement du côté à l'ourlet (positif : vers l'intérieur)
    side_knee: float
    inner_hem: float  # rétrécissement de la jambe côté entrejambe
    inner_knee: float

    @property
    def knee_y(self) -> float:
        return self.crotch_y * KNEE_SHARE


@dataclass(frozen=True)
class Crotch:
    extension: float
    fork_y: float


def _crotches(leg: Leg, extension: float) -> tuple[Crotch, Crotch]:
    """Devant et dos : chute proportionnelle au prolongement (la plus grande au dos)."""
    front = extension * FRONT_EXTENSION_SHARE
    back = extension - front
    crotches = tuple(Crotch(e, leg.crotch_y + CROTCH_DROP_FACTOR * e) for e in (front, back))
    if crotches[1].fork_y > leg.shape.length - MIN_RISE_MM:
        raise DraftingError(
            "inconsistent-measurements",
            "Les mesures données et estimées sont incohérentes : thigh_girth_mm trop grande "
            "pour la hauteur d'entrejambe.",
        )
    return crotches[0], crotches[1]


def _leg_edges(half: Half, leg: Leg, crotch: Crotch) -> tuple[Edge, ...]:
    """De l'ourlet à l'entrejambe en passant par le côté, la taille et la fourche."""
    shape, side = leg.shape, EdgeRole.SEAM
    ext, hip_x = crotch.extension, half.hip
    hem_in = pt(-ext + leg.inner_hem, 0.0)
    hem_out = pt(hip_x - leg.side_hem, 0.0)
    knee_out = pt(hip_x - leg.side_knee, leg.knee_y)
    knee_in = pt(-ext + leg.inner_knee, leg.knee_y)
    hip = pt(hip_x, shape.hip_y)
    control = pt(hip_x, shape.hip_y + SIDE_CONTROL_RISE * shape.depth)
    waist_side = pt(hip_x - shape.shift, shape.length)
    waist = waist_edges(half, shape.length, waist_side)
    fork, point = pt(0.0, crotch.fork_y), pt(-ext, leg.crotch_y)
    return (
        Edge("hem", hem_in, hem_out, EdgeRole.HEM),
        Edge("side-lower", hem_out, knee_out, side),
        Edge("side-middle", knee_out, hip, side),
        Edge("side-upper", hip, waist_side, side, (control,)),
        *waist,
        Edge("rise", waist[-1].end, fork, side),
        Edge("crotch", fork, point, side, (pt(0.0, leg.crotch_y),)),
        Edge("inseam-upper", point, knee_in, side),
        Edge("inseam-lower", knee_in, hem_in, side),
    )


def _leg_panel(names: tuple[str, str], half: Half, leg: Leg, crotch: Crotch) -> Panel:
    facing = Facing.FRONT if names[0].startswith("front") else Facing.BACK
    edges = _leg_edges(half, leg, crotch)
    by_id = {e.id: e for e in edges}
    return Panel(
        names[0],
        names[1],
        edges,
        grain((half.hip - crotch.extension) / 2, leg.shape.length),
        notches=(notch_at_start(by_id["side-upper"]), notch_at_end(by_id["rise"])),
        # milieu de la taille, sur le montant ; dessinés : le devant gauche et le dos droit
        placement=Placement(
            Zone.LEG,
            BodySide.LEFT if facing is Facing.FRONT else BodySide.RIGHT,
            facing,
            pt(0.0, leg.shape.length),
            Landmark.WAIST,
        ),
    )


def _seams(panels: tuple[Panel, ...]) -> tuple[Seam, ...]:
    seams: list[Seam] = []
    for side in ("left", "right"):
        for part in ("side-lower", "side-middle", "side-upper", "inseam-upper"):
            seams.append(_pair(f"{part}-{side}", part, f"front-{side}", f"back-{side}"))
        seams.append(_pair(f"inseam-lower-{side}", "inseam-lower", f"front-{side}", f"back-{side}"))
    for middle, (left, right) in {
        "center-front": ("front-left", "front-right"),
        "center-back": ("back-left", "back-right"),
    }.items():  # montant puis courbe d'entrejambe : une seule couture milieu en deux bords
        seams.extend(_pair(f"{middle}-{part}", part, left, right) for part in ("rise", "crotch"))
    for panel in panels:
        seams.extend(dart_seams(panel))
    return tuple(seams)


def _pair(seam_id: str, edge_id: str, panel_a: str, panel_b: str) -> Seam:
    return Seam(seam_id, (panel_a, edge_id), (panel_b, edge_id))


def _hem_girth(body: Body, params: Mapping[str, float]) -> tuple[float, float]:
    """Tour d'ourlet et part du rétrécissement faite au genou."""
    given = params.get("hem_girth_mm")
    if given is None:
        return body.knee_girth_mm + KNEE_EASE_MM, 1.0  # droite depuis le genou
    return float(given), KNEE_SHARE


def _legs(
    body: Body, params: Mapping[str, float], widths: tuple[float, float]
) -> tuple[Leg, float]:
    """Jambe commune et prolongement d'entrejambe (total devant + dos)."""
    length = float(params["length_mm"])
    depth = body.waist_hip_depth_mm
    if body.crotch_hip_diff_mm is None:
        raise DraftingError(
            "measurement-required", "La mesure crotchHeightMm est requise pour ce vêtement."
        )
    crotch_y = length - depth - body.crotch_hip_diff_mm
    if crotch_y < MIN_LEG_BELOW_CROTCH_MM:
        raise DraftingError(
            "trousers-shorter-than-crotch",
            f"La longueur doit dépasser l'entrejambe d'au moins {MIN_LEG_BELOW_CROTCH_MM} mm.",
        )
    hip_sum = widths[0] + widths[1]
    extension = max(body.thigh_girth_mm + THIGH_EASE_MM - hip_sum, MIN_EXTENSION_MM)
    hem, knee_part = _hem_girth(body, params)
    taper = (hip_sum + extension - hem) / 2
    shift = _shift(body, depth, params)
    side, inner = SIDE_SHARE * taper, (1 - SIDE_SHARE) * taper
    shape = Shape(length, depth, shift, 0.0)
    return Leg(shape, crotch_y, side, side * knee_part, inner, inner * knee_part), extension


def _shift(body: Body, depth: float, params: Mapping[str, float]) -> float:
    fh, fw, bh, bw = hip_waist_split(body, *_eases(params))
    slope = tan(radians(body.hip_inclination_deg)) * depth
    return min(slope, fh - fw - MIN_DART_MM, bh - bw - MIN_DART_MM)


def _eases(params: Mapping[str, float]) -> tuple[float, float]:
    return params.get("waist_ease_mm", 10), params.get("hip_ease_mm", 50)


def _check_hem(leg: Leg, halves: tuple[Half, Half], crotches: tuple[Crotch, Crotch]) -> None:
    for half, crotch in zip(halves, crotches, strict=True):
        width = half.hip + crotch.extension - leg.side_hem - leg.inner_hem
        if width < MIN_HEM_PANEL_MM:
            raise DraftingError(
                "trousers-hem-too-narrow", "Le tour d'ourlet est trop petit pour cette jambe."
            )


def draft_trousers(body: Body, params: Mapping[str, float]) -> Pattern:
    fh, fw, bh, bw = hip_waist_split(body, *_eases(params))
    leg, extension = _legs(body, params, (fh, bh))
    shift = leg.shape.shift
    front = front_half(body, fh, fw, fh - fw - shift)
    back = back_half(body, bh, bw, bh - bw - shift)
    crotch_front, crotch_back = _crotches(leg, extension)
    _check_hem(leg, (front, back), (crotch_front, crotch_back))
    front_left = _leg_panel(("front-left", "Devant gauche"), front, leg, crotch_front)
    back_right = _leg_panel(("back-right", "Dos droit"), back, leg, crotch_back)
    panels = (
        front_left,
        mirror_panel(front_left, "front-right", "Devant droit"),
        mirror_panel(back_right, "back-left", "Dos gauche"),
        back_right,
    )
    return Pattern("trousers", panels, _seams(panels))

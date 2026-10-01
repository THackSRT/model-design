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
from patterning.core.garments.parts import (
    mirror_panel,
    notch_at_end,
    notch_at_start,
    pt,
    vertical_grainline,
)
from patterning.core.model import Edge, EdgeRole, Panel, Pattern, Seam

MIN_SKIRT_BELOW_HIP_MM = 50
SIDE_CONTROL_RISE = 0.5  # point de contrôle du côté galbé : à mi-hauteur taille-hanches


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


def _half_panel(panel_id: str, name: str, half: Half, shape: Shape) -> Panel:
    front = panel_id == "front"
    hem, lower, upper = _side_edges(half, shape)
    waist = waist_edges(half, shape.length, upper.end)
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


def _seams(panels: tuple[Panel, ...]) -> tuple[Seam, ...]:
    seams = [
        Seam(f"side-{part}-{side}", ("front", f"side-{part}"), (f"back-{side}", f"side-{part}"))
        for side in ("right", "left")
        for part in ("lower", "upper")
    ]
    seams.append(Seam("center-back", ("back-right", "center-back"), ("back-left", "center-back")))
    for panel in panels:
        seams.extend(dart_seams(panel))
    return tuple(seams)


def draft_straight_skirt(body: Body, params: Mapping[str, float]) -> Pattern:
    length = float(params["length_mm"])
    depth = body.waist_hip_depth_mm
    _check_length(length, depth)
    front_hip, front_waist, back_hip, back_waist = hip_waist_split(
        body, params.get("waist_ease_mm", 10), params.get("hip_ease_mm", 40)
    )
    slope = math.tan(math.radians(body.hip_inclination_deg)) * depth
    # côté commun ; il laisse au moins la pince minimale devant et dos (taille cousue exacte)
    shift = min(slope, front_hip - front_waist - MIN_DART_MM, back_hip - back_waist - MIN_DART_MM)
    shape = Shape(length, depth, shift, params.get("hem_flare_mm", 0) / 4)
    front = front_half(body, front_hip, front_waist, front_hip - front_waist - shift)
    back = back_half(body, back_hip, back_waist, back_hip - back_waist - shift)
    back_right = _half_panel("back-right", "Dos droit", back, shape)
    panels = (
        _half_panel("front", "Devant", front, shape),
        back_right,
        mirror_panel(back_right, "back-left", "Dos gauche"),
    )
    return Pattern("straight-skirt", panels, _seams(panels))

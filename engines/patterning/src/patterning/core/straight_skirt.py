"""Jupe droite : deux demi-pièces (devant, dos) coupées au pli, côtés galbés hanche-taille.

Tracé volontairement simple pour valider la chaîne ; le tracé de production viendra de GarmentCode.
"""

from dataclasses import dataclass

from patterning.core.geometry import round_point
from patterning.core.model import Edge, EdgeRole, Panel, Pattern, Point, Seam

HIP_DEPTH_RATIO = 0.12  # profondeur taille-hanches, rapportée à la stature
MIN_SKIRT_BELOW_HIP_MM = 50


class DraftingError(ValueError):
    """Entrées valides mais impossibles à tracer."""

    def __init__(self, kind: str, detail: str) -> None:
        super().__init__(detail)
        self.kind = kind
        self.detail = detail


@dataclass(frozen=True)
class SkirtInputs:
    stature_mm: int
    waist_girth_mm: int
    hip_girth_mm: int
    length_mm: int
    waist_ease_mm: int = 10
    hip_ease_mm: int = 40
    hem_flare_mm: int = 0


def _half_panel(panel_id: str, name: str, inputs: SkirtInputs) -> Panel:
    hip_depth = round(inputs.stature_mm * HIP_DEPTH_RATIO)
    length = float(inputs.length_mm)
    hip_y = length - hip_depth
    waist_q = (inputs.waist_girth_mm + inputs.waist_ease_mm) / 4
    hip_q = (inputs.hip_girth_mm + inputs.hip_ease_mm) / 4
    hem_q = hip_q + inputs.hem_flare_mm / 4

    p: dict[str, Point] = {
        "hem_cf": (0.0, 0.0),
        "hem_side": (hem_q, 0.0),
        "hip_side": (hip_q, hip_y),
        "waist_side": (waist_q, length),
        "waist_cf": (0.0, length),
    }
    p = {k: round_point(v) for k, v in p.items()}
    curve_control = round_point((hip_q, hip_y + hip_depth * 0.6))
    edges = (
        Edge("hem", p["hem_cf"], p["hem_side"], EdgeRole.HEM),
        Edge("side-lower", p["hem_side"], p["hip_side"], EdgeRole.SEAM),
        Edge("side-upper", p["hip_side"], p["waist_side"], EdgeRole.SEAM, (curve_control,)),
        Edge("waist", p["waist_side"], p["waist_cf"], EdgeRole.WAISTLINE),
        Edge("fold", p["waist_cf"], p["hem_cf"], EdgeRole.FOLD),
    )
    grain_x = round(hip_q / 2, 2)
    grainline = (round_point((grain_x, length * 0.2)), round_point((grain_x, length * 0.8)))
    return Panel(panel_id, name, edges, grainline, quantity=1, cut_on_fold=True)


def _check(inputs: SkirtInputs) -> None:
    hip_depth = round(inputs.stature_mm * HIP_DEPTH_RATIO)
    if inputs.length_mm < hip_depth + MIN_SKIRT_BELOW_HIP_MM:
        raise DraftingError(
            "skirt-shorter-than-hip-depth",
            f"La longueur ({inputs.length_mm} mm) doit dépasser la ligne des hanches "
            f"({hip_depth} mm) d'au moins {MIN_SKIRT_BELOW_HIP_MM} mm.",
        )


def draft_straight_skirt(inputs: SkirtInputs) -> Pattern:
    _check(inputs)
    front = _half_panel("front", "Devant", inputs)
    back = _half_panel("back", "Dos", inputs)
    seams = (
        Seam("side-lower", ("front", "side-lower"), ("back", "side-lower")),
        Seam("side-upper", ("front", "side-upper"), ("back", "side-upper")),
    )
    return Pattern("straight-skirt", (front, back), seams)

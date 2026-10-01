"""Aiguillage : type de vêtement -> fonction de tracé ; chaque sortie est contrôlée."""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace

from patterning.core.body import Body, RawMeasurements, complete_body, used_estimates
from patterning.core.checks import check_pattern
from patterning.core.errors import DraftingError
from patterning.core.garments.circle_skirt import draft_circle_skirt
from patterning.core.garments.straight_skirt import draft_straight_skirt
from patterning.core.garments.trousers import draft_trousers
from patterning.core.model import Pattern

type Params = Mapping[str, float]
type Drafter = Callable[[Body, Params], Pattern]


@dataclass(frozen=True)
class GarmentDrafter:
    draft: Drafter
    uses: tuple[str, ...]  # champs de RawMeasurements que le tracé exploite (si estimés : listés)
    checks: tuple[str, ...]  # champs de Body dont la cohérence est contrôlée
    # (paramètre, mesure) : la mesure sert au tracé quand le paramètre est absent
    uses_without_param: tuple[tuple[str, str], ...] = ()


SKIRT_CHECKS = (
    "waist_girth_mm",
    "hip_girth_mm",
    "waist_hip_depth_mm",
    "bust_point_width_mm",
    "bum_points_mm",
    "waist_back_width_mm",
    "hip_back_width_mm",
    "hip_inclination_deg",
)

DRAFTERS: dict[str, GarmentDrafter] = {
    "straight-skirt": GarmentDrafter(
        draft_straight_skirt,
        uses=("waist_height_mm", "hip_height_mm", "bust_point_width_mm"),
        checks=SKIRT_CHECKS,
    ),
    "circle-skirt": GarmentDrafter(draft_circle_skirt, uses=(), checks=("waist_girth_mm",)),
    "trousers": GarmentDrafter(
        draft_trousers,
        uses=("waist_height_mm", "hip_height_mm", "bust_point_width_mm", "thigh_girth_mm"),
        checks=(*SKIRT_CHECKS, "crotch_hip_diff_mm", "thigh_girth_mm", "knee_girth_mm"),
        uses_without_param=(("hem_girth_mm", "knee_girth_mm"),),
    ),
}


def draft(garment_type: str, measurements: RawMeasurements, params: Params) -> Pattern:
    drafter = DRAFTERS.get(garment_type)
    if drafter is None:
        raise DraftingError(
            "garment-type-not-supported",
            f"Le type de vêtement « {garment_type} » n'est pas encore tracé par le moteur.",
        )
    body, estimated = complete_body(measurements, drafter.checks)
    uses = drafter.uses + tuple(m for name, m in drafter.uses_without_param if name not in params)
    pattern = replace(
        drafter.draft(body, params),
        estimated_measurements=used_estimates(estimated, uses),
    )
    check_pattern(pattern)
    return pattern

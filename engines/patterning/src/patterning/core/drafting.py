"""Aiguillage : type de vêtement -> fonction de tracé ; chaque sortie est contrôlée."""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace

from patterning.core.body import Body, RawMeasurements, complete_body
from patterning.core.checks import check_pattern
from patterning.core.errors import DraftingError
from patterning.core.model import Pattern
from patterning.core.straight_skirt import SkirtInputs, draft_straight_skirt

type Params = Mapping[str, float]
type Drafter = Callable[[Body, Params], Pattern]


@dataclass(frozen=True)
class GarmentDrafter:
    draft: Drafter
    uses: tuple[str, ...]  # champs de RawMeasurements que le tracé exploite (si estimés : listés)


def _straight_skirt(body: Body, params: Params) -> Pattern:
    return draft_straight_skirt(
        SkirtInputs(
            stature_mm=round(body.stature_mm),
            waist_girth_mm=round(body.waist_girth_mm),
            hip_girth_mm=round(body.hip_girth_mm),
            length_mm=round(params["length_mm"]),
            waist_ease_mm=round(params.get("waist_ease_mm", 10)),
            hip_ease_mm=round(params.get("hip_ease_mm", 40)),
            hem_flare_mm=round(params.get("hem_flare_mm", 0)),
        )
    )


DRAFTERS: dict[str, GarmentDrafter] = {
    "straight-skirt": GarmentDrafter(_straight_skirt, uses=()),
}


def draft(garment_type: str, measurements: RawMeasurements, params: Params) -> Pattern:
    drafter = DRAFTERS.get(garment_type)
    if drafter is None:
        raise DraftingError(
            "garment-type-not-supported",
            f"Le type de vêtement « {garment_type} » n'est pas encore tracé par le moteur.",
        )
    body, estimated = complete_body(measurements)
    pattern = replace(
        drafter.draft(body, params),
        estimated_measurements=tuple(name for name in estimated if name in drafter.uses),
    )
    check_pattern(pattern)
    return pattern

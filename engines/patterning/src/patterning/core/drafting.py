"""Aiguillage : type de vêtement -> fonction de tracé ; chaque sortie est contrôlée."""

from collections.abc import Callable, Mapping
from dataclasses import dataclass, replace

from patterning.core.body import Body, RawMeasurements, complete_body, used_estimates
from patterning.core.checks import check_pattern
from patterning.core.errors import DraftingError
from patterning.core.garments.bodice import draft_bodice, sleeve_estimates
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
    # mesures sans lesquelles le tracé n'a pas de sens : jamais estimées (422 si elles manquent)
    requires: tuple[str, ...] = ()
    # mesures estimées en plus, selon les paramètres (ex. poignet seulement avec une manche)
    extra_uses: Callable[[Params], tuple[str, ...]] = lambda params: ()


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

BODICE_CHECKS = (
    "bust_girth_mm",
    "waist_girth_mm",
    "back_waist_length_mm",
    "front_waist_length_mm",
    "neck_shoulder_to_bust_point_mm",
    "bust_point_width_mm",
    "shoulder_width_mm",
    "armscye_depth_mm",
    "waist_back_width_mm",
    "neck_width_mm",
    "wrist_girth_mm",
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
        uses=(
            "waist_height_mm",
            "hip_height_mm",
            "bust_point_width_mm",
            "thigh_girth_mm",
            "crotch_height_mm",  # hauteur absolue : l'entrejambe se mesure depuis le sol
        ),
        checks=(*SKIRT_CHECKS, "crotch_hip_diff_mm", "thigh_girth_mm", "knee_girth_mm"),
        uses_without_param=(("hem_girth_mm", "knee_girth_mm"),),
    ),
    "bodice": GarmentDrafter(
        draft_bodice,
        uses=(
            "front_waist_length_mm",
            "neck_shoulder_to_bust_point_mm",
            "bust_point_width_mm",
            "shoulder_width_mm",
            "armscye_depth_mm",
        ),
        checks=BODICE_CHECKS,
        requires=("bust_girth_mm", "back_waist_length_mm"),
        extra_uses=sleeve_estimates,
    ),
}


def _camel(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(word.capitalize() for word in rest)


def _require(measurements: RawMeasurements, names: tuple[str, ...]) -> None:
    for name in names:
        if getattr(measurements, name) is None:
            raise DraftingError(
                "measurement-required", f"La mesure {_camel(name)} est requise pour ce vêtement."
            )


def draft(garment_type: str, measurements: RawMeasurements, params: Params) -> Pattern:
    drafter = DRAFTERS.get(garment_type)
    if drafter is None:
        raise DraftingError(
            "garment-type-not-supported",
            f"Le type de vêtement « {garment_type} » n'est pas encore tracé par le moteur.",
        )
    _require(measurements, drafter.requires)
    body, estimated = complete_body(measurements, drafter.checks)
    uses = drafter.uses + drafter.extra_uses(params)
    uses += tuple(m for name, m in drafter.uses_without_param if name not in params)
    pattern = replace(
        drafter.draft(body, params),
        estimated_measurements=used_estimates(estimated, uses),
    )
    check_pattern(pattern)
    return pattern

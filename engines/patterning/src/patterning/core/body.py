"""Mesures du corps complétées : tout ce que les tracés utilisent, en mm (pentes en degrés).

Les rapports d'estimation viennent des corps moyens `mean_female` / `mean_male` de GarmentCode
(`assets/bodies`, commit d449629, licence MIT ; voir ADR 0010). Ce sont des hypothèses à valider
par le modéliste. Une mesure estimée est listée dans `estimated`, sous le nom de son champ de
`RawMeasurements`.

Tour de cuisse et tour de genou absents : rapport moyen au tour de hanches par sexe, tiré d'ANSUR II
(US Army 2012, domaine public ; moyennes `mean` en cm de `prototype/js/anthro-model.js`).
Femmes : hanches 102,1, cuisse 61,6, genou 38,1 -> cuisse/hanches 0,603, genou/hanches 0,373.
Hommes : hanches 102,0, cuisse 62,5, genou 38,9 -> cuisse/hanches 0,613, genou/hanches 0,381.

Tour de poignet absent : rapport moyen au tour de poitrine par sexe (même source).
Femmes : poitrine 94,7, poignet 15,5 -> 0,164. Hommes : poitrine 105,9, poignet 17,6 -> 0,166.

Longueur taille devant absente : le prototype n'embarque aucune moyenne ANSUR II de cette
longueur ; elle est estimée par un rapport à la longueur taille dos (à valider par le modéliste) :
1,06 pour les femmes (le devant couvre la poitrine), 1,03 pour les hommes. L'écart devant - dos
est la largeur de la pince de poitrine du corsage.
"""

from collections.abc import Sequence
from dataclasses import dataclass, fields

from patterning.core.errors import DraftingError


@dataclass(frozen=True)
class RawMeasurements:
    """Mesures telles que demandées : cinq requises, le reste facultatif."""

    sex: str
    stature_mm: float
    chest_girth_mm: float
    waist_girth_mm: float
    hip_girth_mm: float
    bust_girth_mm: float | None = None
    under_bust_girth_mm: float | None = None
    thigh_girth_mm: float | None = None
    knee_girth_mm: float | None = None
    wrist_girth_mm: float | None = None
    cervicale_height_mm: float | None = None
    waist_height_mm: float | None = None
    hip_height_mm: float | None = None
    crotch_height_mm: float | None = None
    back_waist_length_mm: float | None = None
    front_waist_length_mm: float | None = None
    neck_shoulder_to_bust_point_mm: float | None = None
    bust_point_width_mm: float | None = None
    shoulder_width_mm: float | None = None
    armscye_depth_mm: float | None = None
    arm_length_mm: float | None = None


@dataclass(frozen=True)
class Ratios:
    """Rapports d'estimation d'un corps moyen (à la stature, sauf mention)."""

    head: float
    back_waist: float
    waist_hip_depth: float
    shoulder_width: float
    arm_length: float
    armscye_depth: float
    neck_shoulder_to_bust_point: float
    bust_point_width_of_bust: float
    underbust_of_bust: float
    waist_back_width_of_waist: float
    back_width_of_bust: float
    hip_back_width_of_hip: float
    bum_points_of_hip: float
    neck_width: float
    shoulder_incl_deg: float
    hip_inclination_deg: float
    thigh_of_hip: float
    knee_of_hip: float
    wrist_of_bust: float
    front_of_back_waist: float


FEMALE_RATIOS = Ratios(
    0.154, 0.215, 0.136, 0.209, 0.31, 0.076, 0.154, 0.166, 0.829, 0.47, 0.47, 0.535, 0.17, 0.107,
    21.0, 12.7, 0.603, 0.373, 0.164, 1.06,
)  # fmt: skip
MALE_RATIOS = Ratios(
    0.152, 0.214, 0.137, 0.215, 0.318, 0.073, 0.145, 0.173, 0.905, 0.46, 0.49, 0.524, 0.17, 0.114,
    22.5, 6.7, 0.613, 0.381, 0.166, 1.03,
)  # fmt: skip
RATIOS = {"female": FEMALE_RATIOS, "male": MALE_RATIOS}


@dataclass(frozen=True)
class Body:
    sex: str
    stature_mm: float
    bust_girth_mm: float
    underbust_girth_mm: float
    waist_girth_mm: float
    hip_girth_mm: float
    head_length_mm: float
    back_waist_length_mm: float
    waist_hip_depth_mm: float
    shoulder_width_mm: float
    bust_point_width_mm: float
    arm_length_mm: float
    neck_shoulder_to_bust_point_mm: float
    armscye_depth_mm: float
    waist_back_width_mm: float
    back_width_mm: float
    hip_back_width_mm: float
    bum_points_mm: float
    neck_width_mm: float
    shoulder_incl_deg: float
    hip_inclination_deg: float
    thigh_girth_mm: float
    knee_girth_mm: float
    wrist_girth_mm: float
    front_waist_length_mm: float
    crotch_hip_diff_mm: float | None = None


class _Fill:
    """Prend la mesure donnée, sinon l'estimation, et note ce qui a été estimé."""

    def __init__(self) -> None:
        self.estimated: list[str] = []

    def value(self, name: str, given: float | None, estimate: float) -> float:
        if given is not None:
            return float(given)
        self.estimated.append(name)
        return estimate


def _check_positive(body: Body, checked: Sequence[str] | None) -> None:
    """Refuse une mesure nulle ou négative ; le détail cite le champ, jamais sa valeur."""
    for f in fields(body):
        value = getattr(body, f.name)
        if (checked is None or f.name in checked) and isinstance(value, float) and value <= 0:
            raise DraftingError(
                "inconsistent-measurements",
                f"Les mesures données et estimées sont incohérentes : {f.name} doit être "
                "strictement positive.",
            )


def used_estimates(estimated: Sequence[str], uses: Sequence[str]) -> tuple[str, ...]:
    """Mesures estimées qui servent au tracé : `uses` et les mesures dont leur estimation dépend."""
    used = {name for name in estimated if name in uses}
    if "bust_point_width_mm" in used:
        used |= {"bust_girth_mm"} & set(estimated)
    if "waist_height_mm" in used and "hip_height_mm" not in estimated:
        used |= {"cervicale_height_mm", "back_waist_length_mm"} & set(estimated)
    return tuple(sorted(used))


def complete_body(
    raw: RawMeasurements, checked: Sequence[str] | None = None
) -> tuple[Body, tuple[str, ...]]:
    """Complète les mesures ; rend le corps et les champs estimés, triés.

    `checked` : champs du corps dont la cohérence est contrôlée (par défaut tous).
    """
    if raw.sex not in RATIOS:
        raise DraftingError("unknown-sex", f"Sexe inconnu : {raw.sex}.")
    r = RATIOS[raw.sex]
    fill = _Fill()
    stature = float(raw.stature_mm)
    bust = fill.value("bust_girth_mm", raw.bust_girth_mm, float(raw.chest_girth_mm))
    waist = float(raw.waist_girth_mm)
    hip = float(raw.hip_girth_mm)
    cervicale = fill.value("cervicale_height_mm", raw.cervicale_height_mm, stature * (1 - r.head))
    back_waist = fill.value(
        "back_waist_length_mm", raw.back_waist_length_mm, r.back_waist * stature
    )
    waist_h = fill.value("waist_height_mm", raw.waist_height_mm, cervicale - back_waist)
    hip_h = fill.value("hip_height_mm", raw.hip_height_mm, waist_h - r.waist_hip_depth * stature)
    crotch = raw.crotch_height_mm
    body = Body(
        sex=raw.sex,
        stature_mm=stature,
        bust_girth_mm=bust,
        underbust_girth_mm=fill.value(
            "under_bust_girth_mm", raw.under_bust_girth_mm, r.underbust_of_bust * bust
        ),
        waist_girth_mm=waist,
        hip_girth_mm=hip,
        head_length_mm=stature - cervicale,
        back_waist_length_mm=back_waist,
        waist_hip_depth_mm=waist_h - hip_h,
        shoulder_width_mm=fill.value(
            "shoulder_width_mm", raw.shoulder_width_mm, r.shoulder_width * stature
        ),
        bust_point_width_mm=fill.value(
            "bust_point_width_mm", raw.bust_point_width_mm, r.bust_point_width_of_bust * bust
        ),
        arm_length_mm=fill.value("arm_length_mm", raw.arm_length_mm, r.arm_length * stature),
        neck_shoulder_to_bust_point_mm=fill.value(
            "neck_shoulder_to_bust_point_mm",
            raw.neck_shoulder_to_bust_point_mm,
            r.neck_shoulder_to_bust_point * stature,
        ),
        armscye_depth_mm=fill.value(
            "armscye_depth_mm", raw.armscye_depth_mm, r.armscye_depth * stature
        ),
        waist_back_width_mm=r.waist_back_width_of_waist * waist,
        back_width_mm=r.back_width_of_bust * bust,
        hip_back_width_mm=r.hip_back_width_of_hip * hip,
        bum_points_mm=r.bum_points_of_hip * hip,
        neck_width_mm=r.neck_width * stature,
        shoulder_incl_deg=r.shoulder_incl_deg,
        hip_inclination_deg=r.hip_inclination_deg,
        thigh_girth_mm=fill.value("thigh_girth_mm", raw.thigh_girth_mm, r.thigh_of_hip * hip),
        knee_girth_mm=fill.value("knee_girth_mm", raw.knee_girth_mm, r.knee_of_hip * hip),
        wrist_girth_mm=fill.value("wrist_girth_mm", raw.wrist_girth_mm, r.wrist_of_bust * bust),
        front_waist_length_mm=fill.value(
            "front_waist_length_mm", raw.front_waist_length_mm, r.front_of_back_waist * back_waist
        ),
        crotch_hip_diff_mm=None if crotch is None else hip_h - crotch,
    )
    _check_positive(body, checked)
    return body, tuple(sorted(fill.estimated))

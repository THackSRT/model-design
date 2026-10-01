"""Constructeurs de données de test lisibles (données synthétiques, jamais de vrais clients)."""

from dataclasses import replace

from patterning.core.body import RawMeasurements
from patterning.core.straight_skirt import SkirtInputs

REFERENCE_SKIRT = SkirtInputs(stature_mm=1650, waist_girth_mm=700, hip_girth_mm=960, length_mm=600)


def a_skirt(**changes: int) -> SkirtInputs:
    return replace(REFERENCE_SKIRT, **changes)


def reference_request() -> dict[str, object]:
    return {
        "measurements": {
            "sex": "female",
            "statureMm": 1650,
            "chestGirthMm": 880,
            "waistGirthMm": 700,
            "hipGirthMm": 960,
        },
        "garment": {"type": "straight-skirt", "params": {"lengthMm": 600}},
    }


def minimal_measurements(sex: str = "female") -> RawMeasurements:
    """Les cinq mesures requises seulement (données synthétiques)."""
    return RawMeasurements(
        sex=sex, stature_mm=1650, chest_girth_mm=880, waist_girth_mm=700, hip_girth_mm=960
    )


def full_measurements() -> RawMeasurements:
    """Toutes les mesures données : rien à estimer (données synthétiques)."""
    return replace(
        minimal_measurements(),
        bust_girth_mm=900,
        underbust_girth_mm=750,
        thigh_girth_mm=560,
        wrist_girth_mm=160,
        cervicale_height_mm=1400,
        waist_height_mm=1020,
        hip_height_mm=820,
        crotch_height_mm=740,
        back_waist_length_mm=380,
        front_waist_length_mm=420,
        neck_shoulder_to_bust_point_mm=250,
        bust_point_width_mm=170,
        shoulder_width_mm=380,
        armscye_depth_mm=190,
        arm_length_mm=560,
    )

"""Constructeurs de données de test lisibles (données synthétiques, jamais de vrais clients)."""

from dataclasses import replace

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

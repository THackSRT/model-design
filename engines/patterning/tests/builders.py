"""Constructeurs de données de test lisibles (données synthétiques, jamais de vrais clients)."""

from dataclasses import replace
from itertools import pairwise

from patterning.core.body import RawMeasurements
from patterning.core.geometry import sample_edge
from patterning.core.model import Panel

REFERENCE_PARAMS: dict[str, dict[str, float]] = {
    "straight-skirt": {"length_mm": 600},
    "circle-skirt": {"length_mm": 650, "circle_fraction": 1, "waistband_width_mm": 40},
    "trousers": {"length_mm": 1000, "hem_girth_mm": 440},
    "bodice": {"length_below_waist_mm": 60, "front_neck_depth_mm": 30},
    "bodice-with-sleeves": {
        "length_below_waist_mm": 60,
        "front_neck_depth_mm": 30,
        "sleeve_length_mm": 600,
        "sleeve_cap_ease_mm": 15,
        "sleeve_hem_girth_mm": 240,
    },
}


def reference_measurements(case: str = "") -> RawMeasurements:
    """Mesures synthétiques des références golden : la taille est assez fine pour des pinces."""
    raw = replace(minimal_measurements(), waist_girth_mm=640, crotch_height_mm=770)
    if case.startswith("bodice"):  # poitrine et longueur taille dos sont obligatoires
        raw = replace(raw, bust_girth_mm=900, back_waist_length_mm=380)
    return raw


def reference_request() -> dict[str, object]:
    return {
        "measurements": {
            "sex": "female",
            "statureMm": 1650,
            "chestGirthMm": 880,
            "waistGirthMm": 640,
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
        under_bust_girth_mm=750,
        thigh_girth_mm=560,
        knee_girth_mm=380,
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


def self_crossings(panel: Panel) -> int:
    """Nombre de croisements entre bords non consécutifs (un contour simple n'en a aucun)."""
    segments = []
    for index, edge in enumerate(panel.edges):
        points = sample_edge(edge, 16)
        segments += [(index, a, b) for a, b in pairwise(points)]

    def side(p: tuple[float, float], a: tuple[float, float], b: tuple[float, float]) -> float:
        return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])

    count, last = 0, len(panel.edges) - 1
    for i, (ei, a, b) in enumerate(segments):
        for ej, c, d in segments[i + 1 :]:
            if ej - ei in (0, 1) or (ei == 0 and ej == last):
                continue
            if side(c, a, b) * side(d, a, b) < 0 and side(a, c, d) * side(b, c, d) < 0:
                count += 1
    return count

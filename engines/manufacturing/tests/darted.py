"""Données de test avec pinces (jupe à pinces du moteur de patronage, rectangle à pince en V)."""

import json
from typing import Any

from manufacturing.core.model import Panel, Point, Seam
from tests.builders import FIXTURES, polygon_panel


def darted_skirt_spec() -> dict[str, Any]:
    """Jupe droite à pinces, copie de la référence du moteur de patronage."""
    path = FIXTURES / "darted-straight-skirt-spec.json"
    spec: dict[str, Any] = json.loads(path.read_text("utf-8"))
    return spec


def darted_rectangle(panel_id: str = "p") -> tuple[Panel, Seam]:
    """Rectangle 100 x 200 avec une pince en V (jambes e3 et e4) au bord haut, et sa couture."""
    points: list[Point] = [(0, 0), (100, 0), (100, 200), (60, 200), (50, 150), (40, 200), (0, 200)]
    return polygon_panel(points, panel_id), Seam("dart", (panel_id, "e3"), (panel_id, "e4"))

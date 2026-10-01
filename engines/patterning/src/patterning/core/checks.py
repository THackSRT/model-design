"""Contrôles d'un patron tracé : toute violation est un bogue du tracé (`PatternCheckError`)."""

import math

from patterning.core.errors import PatternCheckError
from patterning.core.geometry import edge_length, signed_area
from patterning.core.model import Panel, Pattern, Seam

SEAM_TOLERANCE_MM = 0.5
NOTCH_TOLERANCE_MM = 0.01
CLOSURE_TOLERANCE_MM = 1e-6


def _check_panel(panel: Panel) -> None:
    edges = panel.edges
    for current, following in zip(edges, edges[1:] + edges[:1], strict=True):
        if math.dist(current.end, following.start) > CLOSURE_TOLERANCE_MM:
            raise PatternCheckError(
                f"Pièce {panel.id} : le bord {current.id} ne rejoint pas {following.id}."
            )
    if signed_area(edges) <= 0:
        raise PatternCheckError(f"Pièce {panel.id} : contour hors du sens trigonométrique.")
    for notch in panel.notches:
        edge = next((e for e in edges if e.id == notch.edge_id), None)
        if edge is None or not 0 <= notch.distance_mm <= edge_length(edge) + NOTCH_TOLERANCE_MM:
            raise PatternCheckError(f"Pièce {panel.id} : cran hors du bord {notch.edge_id}.")


def _check_seam(pattern: Pattern, seam: Seam) -> None:
    try:
        a = pattern.panel(seam.a[0]).edge(seam.a[1])
        b = pattern.panel(seam.b[0]).edge(seam.b[1])
    except StopIteration:
        raise PatternCheckError(f"Couture {seam.id} : bord introuvable.") from None
    gap = edge_length(a) - edge_length(b)
    if abs(gap - seam.ease_mm) > SEAM_TOLERANCE_MM:
        raise PatternCheckError(
            f"Couture {seam.id} : écart de {gap:.2f} mm, embu attendu {seam.ease_mm:.2f} mm."
        )


def check_pattern(pattern: Pattern) -> None:
    for panel in pattern.panels:
        _check_panel(panel)
    for seam in pattern.seams:
        _check_seam(pattern, seam)

"""Manche montée en une pièce : tête embue sur l'emmanchure, dessous de bras, ourlet.

Conception d'après GarmentCode (licence MIT, commit d449629) :
`assets/garment_programs/sleeves.py` (`SleevePanel`, `ArmholeCurve`) ; réécriture en Python pur
et en mm, sans code copié. Repris : la tête de manche est une courbe dont la longueur vaut
l'emmanchure devant + dos, plus l'embu demandé.
Différences voulues (ADR 0010) : la hauteur de tête est trouvée par dichotomie à nombre d'itérations
fixe (GarmentCode utilise L-BFGS-B : 4 s et des écarts de 0,5 mm pour des arrondis) ; la manche est
symétrique (dessous de bras identiques) ; l'embu est réparti entre devant et dos au prorata des
emmanchures, les crans (un devant, deux au dos, un au sommet) suivent cette répartition.
"""

from dataclasses import dataclass

from patterning.core.curves import BISECTION_ITERATIONS
from patterning.core.errors import DraftingError
from patterning.core.garments.parts import pt, vertical_grainline
from patterning.core.geometry import edge_length
from patterning.core.model import Edge, EdgeRole, Notch, Panel, Seam

SLEEVE_WIDTH_SHARE = (
    0.55  # largeur de manche sous l'aisselle / emmanchure moyenne (aisance de biceps)
)
CAP_CONTROL = 0.5  # point de contrôle de la tête, à mi-largeur, à la hauteur du sommet
MIN_UNDERARM_MM = 20.0  # le dessous de bras garde au moins 20 mm
NOTCH_SHARE = 0.4  # position des crans, depuis l'aisselle, en part de l'emmanchure


@dataclass(frozen=True)
class SleeveSpec:
    length: float  # du sommet (point d'épaule) à l'ourlet
    cap_ease: float
    hem_girth: float


def _cap(half_width: float, height: float, length: float) -> Edge:
    """Demi-tête côté devant : de l'aisselle au sommet, tangente horizontale au sommet."""
    top = (0.0, length)
    return Edge(
        "cap-front",
        (half_width, length - height),
        top,
        EdgeRole.SEAM,
        ((CAP_CONTROL * half_width, length),),
    )


def _cap_height(half_width: float, length: float, target: float) -> float:
    """Hauteur de tête pour laquelle la demi-tête mesure `target` (la longueur croît avec elle)."""
    low, high = 0.0, target
    for _ in range(BISECTION_ITERATIONS):
        mid = (low + high) / 2
        if edge_length(_cap(half_width, mid, length)) < target:
            low = mid
        else:
            high = mid
    return (low + high) / 2


def _edges(width: float, hem: float, under_y: float, length: float) -> tuple[Edge, ...]:
    """Contour trigonométrique : ourlet, dessous de bras, demi-têtes devant puis dos."""
    seam = EdgeRole.SEAM
    return (
        Edge("hem", pt(-hem, 0.0), pt(hem, 0.0), EdgeRole.HEM),
        Edge("underarm-front", pt(hem, 0.0), pt(width, under_y), seam),
        Edge(
            "cap-front",
            pt(width, under_y),
            pt(0.0, length),
            seam,
            (pt(CAP_CONTROL * width, length),),
        ),
        Edge(
            "cap-back",
            pt(0.0, length),
            pt(-width, under_y),
            seam,
            (pt(-CAP_CONTROL * width, length),),
        ),
        Edge("underarm-back", pt(-width, under_y), pt(-hem, 0.0), seam),
    )


def draft_sleeve(
    front_arm: float, back_arm: float, spec: SleeveSpec
) -> tuple[Panel, tuple[Seam, ...]]:
    """Manche (à couper deux fois) et ses coutures : dessous de bras, têtes embuées."""
    half_cap = (front_arm + back_arm + spec.cap_ease) / 2
    width = SLEEVE_WIDTH_SHARE * (front_arm + back_arm) / 2
    height = _cap_height(width, spec.length, half_cap)
    if spec.length - height < MIN_UNDERARM_MM:
        raise DraftingError(
            "sleeve-shorter-than-cap",
            "La longueur de manche doit dépasser la hauteur de la tête de manche "
            f"d'au moins {MIN_UNDERARM_MM:.0f} mm.",
        )
    edges = _edges(width, spec.hem_girth / 2, spec.length - height, spec.length)
    front_len, back_len = edge_length(edges[2]), edge_length(edges[3])
    notches = (
        Notch("cap-front", round(NOTCH_SHARE * front_len, 2)),
        Notch("cap-front", round(front_len, 2)),
        Notch("cap-back", round((1 - NOTCH_SHARE) * back_len, 2), 2),
    )
    panel = Panel(
        "sleeve",
        "Manche",
        edges,
        vertical_grainline(0.0, spec.length),
        quantity=2,
        notches=notches,
    )
    share = spec.cap_ease * front_arm / (front_arm + back_arm)
    seams = (
        Seam("sleeve-underarm", ("sleeve", "underarm-front"), ("sleeve", "underarm-back")),
        Seam("armhole-front", ("sleeve", "cap-front"), ("front", "armhole"), share),
        Seam(
            "armhole-back", ("sleeve", "cap-back"), ("back-right", "armhole"), spec.cap_ease - share
        ),
    )
    return panel, seams

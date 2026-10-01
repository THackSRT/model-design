"""Éléments communs des tracés : points arrondis, pièces en miroir, crans.

Aucun code de GarmentCode ici : ce sont des outils propres au moteur.
"""

from collections.abc import Sequence
from dataclasses import replace

from patterning.core.geometry import edge_length, round_point
from patterning.core.model import Edge, Notch, Panel, Point

GRAIN_LOW = 0.2  # droit fil : de 20 % à 80 % de la hauteur de la pièce
GRAIN_HIGH = 0.8


def pt(x: float, y: float) -> Point:
    """Point arrondi à 0,01 mm : tous les points d'un tracé passent par ici."""
    return round_point((x, y))


def reverse_edge(edge: Edge) -> Edge:
    return Edge(edge.id, edge.end, edge.start, edge.role, tuple(reversed(edge.controls)))


def notch_at_end(edge: Edge) -> Notch:
    """Cran à l'extrémité d'arrivée du bord."""
    return Notch(edge.id, round(edge_length(edge), 2))


def notch_at_start(edge: Edge) -> Notch:
    """Cran à l'extrémité de départ du bord."""
    return Notch(edge.id, 0.0)


def notch_at_middle(edges: Sequence[Edge]) -> Notch:
    """Cran au milieu d'une suite de bords bout à bout (ex. un arc coupé en plusieurs courbes)."""
    lengths = [edge_length(e) for e in edges]
    target = sum(lengths) / 2
    done = 0.0
    for edge, length in zip(edges, lengths, strict=True):
        if done + length >= target - 1e-9:
            return Notch(edge.id, round(min(max(target - done, 0.0), length), 2))
        done += length
    raise ValueError("Suite de bords vide")


def mirror_panel(panel: Panel, panel_id: str, name: str) -> Panel:
    """Pièce symétrique (autre côté du corps) : contour toujours trigonométrique, crans suivis."""
    xmax = max(p[0] for e in panel.edges for p in (e.start, e.end, *e.controls))

    def flip(p: Point) -> Point:
        return pt(xmax - p[0], p[1])

    edges = tuple(
        Edge(e.id, flip(e.end), flip(e.start), e.role, tuple(flip(c) for c in reversed(e.controls)))
        for e in reversed(panel.edges)
    )
    notches = tuple(
        Notch(
            n.edge_id,
            round(max(edge_length(panel.edge(n.edge_id)) - n.distance_mm, 0.0), 2),
            n.count,
        )
        for n in panel.notches
    )
    grain = (flip(panel.grainline[0]), flip(panel.grainline[1]))
    return replace(panel, id=panel_id, name=name, edges=edges, grainline=grain, notches=notches)


def vertical_grainline(x: float, height: float) -> tuple[Point, Point]:
    return pt(x, height * GRAIN_LOW), pt(x, height * GRAIN_HIGH)

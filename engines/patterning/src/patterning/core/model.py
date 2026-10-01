"""Objets du cœur : un patron est un ensemble de pièces à plat et de coutures (en mm)."""

from dataclasses import dataclass, field
from enum import StrEnum

type Point = tuple[float, float]


class EdgeRole(StrEnum):
    SEAM = "seam"
    FOLD = "fold"
    HEM = "hem"
    WAISTLINE = "waistline"
    OPENING = "opening"


@dataclass(frozen=True)
class Edge:
    id: str
    start: Point
    end: Point
    role: EdgeRole
    controls: tuple[Point, ...] = ()


@dataclass(frozen=True)
class Notch:
    """Cran posé sur un bord, à `distance_mm` de son début ; `count` 1 à 3."""

    edge_id: str
    distance_mm: float
    count: int = 1


@dataclass(frozen=True)
class Panel:
    id: str
    name: str
    edges: tuple[Edge, ...]
    grainline: tuple[Point, Point]
    quantity: int = 1
    cut_on_fold: bool = False
    notches: tuple[Notch, ...] = ()

    def edge(self, edge_id: str) -> Edge:
        return next(e for e in self.edges if e.id == edge_id)


@dataclass(frozen=True)
class Seam:
    id: str
    a: tuple[str, str]
    b: tuple[str, str]
    ease_mm: float = 0.0  # le bord a est plus long que b de cette valeur (embu)


@dataclass(frozen=True)
class Pattern:
    garment_type: str
    panels: tuple[Panel, ...]
    seams: tuple[Seam, ...] = field(default_factory=tuple)
    estimated_measurements: tuple[str, ...] = ()

    def panel(self, panel_id: str) -> Panel:
        return next(p for p in self.panels if p.id == panel_id)

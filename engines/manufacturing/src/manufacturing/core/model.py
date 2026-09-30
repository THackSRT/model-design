"""Objets du cœur : pièces à plat, politique de valeurs de couture, contours de coupe (en mm)."""

from dataclasses import dataclass, field
from enum import StrEnum

type Point = tuple[float, float]

DEFAULT_SEAM_ALLOWANCE_MM = 10.0  # valeur de couture par défaut (à confirmer avec le modéliste)
DEFAULT_HEM_ALLOWANCE_MM = 30.0  # valeur d'ourlet par défaut (à confirmer avec le modéliste)


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
    controls: tuple[Point, ...] = ()
    role: EdgeRole = EdgeRole.SEAM


@dataclass(frozen=True)
class Panel:
    id: str
    name: str
    edges: tuple[Edge, ...]
    grainline: tuple[Point, Point] | None = None
    quantity: int = 1
    cut_on_fold: bool = False


@dataclass(frozen=True)
class Seam:
    id: str
    a: tuple[str, str]
    b: tuple[str, str]


@dataclass(frozen=True)
class Pattern:
    garment_type: str
    panels: tuple[Panel, ...]
    seams: tuple[Seam, ...] = ()


@dataclass(frozen=True)
class AllowancePolicy:
    """Priorité : `by_edge` (clé : pièce, bord) > `by_role` > `default_mm`."""

    default_mm: float = DEFAULT_SEAM_ALLOWANCE_MM
    by_role: dict[EdgeRole, float] = field(default_factory=dict)
    by_edge: dict[tuple[str, str], float] = field(default_factory=dict)


DEFAULT_POLICY = AllowancePolicy(by_role={EdgeRole.HEM: DEFAULT_HEM_ALLOWANCE_MM})


@dataclass(frozen=True)
class SeamEdge:
    """Un bord aplati de la ligne de couture, avec sa valeur de couture."""

    edge_id: str
    role: EdgeRole
    points: tuple[Point, ...]
    allowance_mm: float


@dataclass(frozen=True)
class CutOutline:
    """Contour d'une pièce : bords de couture et ligne de coupe (sens trigonométrique)."""

    panel_id: str
    seam_edges: tuple[SeamEdge, ...]
    cut_line: tuple[Point, ...]

    @property
    def seam_line(self) -> tuple[Point, ...]:
        """Ligne de couture fermée, sans point répété à la jonction des bords."""
        points: list[Point] = []
        for edge in self.seam_edges:
            points.extend(edge.points[:-1])
        return tuple(points)

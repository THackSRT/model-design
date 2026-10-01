"""Constructeurs de données de test lisibles (données synthétiques, jamais de vrais clients)."""

import json
from pathlib import Path
from typing import Any

from manufacturing.core.model import Edge, EdgeRole, NotchPlacement, Panel, Pattern, Point, Seam

FIXTURES = Path(__file__).parent / "fixtures"


def _point(raw: list[float]) -> Point:
    return (float(raw[0]), float(raw[1]))


def polygon_panel(
    points: list[Point], panel_id: str = "p", roles: list[EdgeRole] | None = None
) -> Panel:
    """Pièce à bords droits `e0`, `e1`… reliant les points dans l'ordre (contour fermé)."""
    n = len(points)
    edges = tuple(
        Edge(f"e{i}", points[i], points[(i + 1) % n], role=(roles[i] if roles else EdgeRole.SEAM))
        for i in range(n)
    )
    return Panel(panel_id, panel_id, edges)


def rectangle(width: float, height: float, panel_id: str = "rect") -> Panel:
    return polygon_panel([(0, 0), (width, 0), (width, height), (0, height)], panel_id)


def a_pattern(*panels: Panel) -> Pattern:
    return Pattern("test", tuple(panels))


def skirt_pattern() -> Pattern:
    """Jupe droite de référence (fixture d'entrée copiée du moteur de patronage)."""
    spec: dict[str, Any] = json.loads((FIXTURES / "straight-skirt-spec.json").read_text("utf-8"))
    panels = tuple(
        Panel(
            id=p["id"],
            name=p["name"],
            edges=tuple(
                Edge(
                    id=e["id"],
                    start=_point(e["from"]),
                    end=_point(e["to"]),
                    controls=tuple(_point(c) for c in e.get("controls", [])),
                    role=EdgeRole(e.get("role", "seam")),
                )
                for e in p["edges"]
            ),
            grainline=(_point(p["grainline"][0]), _point(p["grainline"][1])),
            quantity=p["quantity"],
            cut_on_fold=p.get("cutOnFold", False),
            notches=tuple(
                NotchPlacement(n["edgeId"], n["distanceMm"], n.get("count", 1))
                for n in p.get("notches", [])
            ),
        )
        for p in spec["panels"]
    )
    seams = tuple(
        Seam(s["id"], (s["a"]["panelId"], s["a"]["edgeId"]), (s["b"]["panelId"], s["b"]["edgeId"]))
        for s in spec["seams"]
    )
    return Pattern(spec["garment"]["type"], panels, seams)


def skirt_spec() -> dict[str, Any]:
    """Spécification JSON de la jupe de référence."""
    spec: dict[str, Any] = json.loads((FIXTURES / "straight-skirt-spec.json").read_text("utf-8"))
    return spec

"""Valeurs de couture : résolution par bord (bord > rôle > défaut) et contours de coupe."""

from manufacturing.core.darts import DartPair, bridge_contour, dart_edge_ids, dart_pairs
from manufacturing.core.errors import (
    ALLOWANCE_ON_DART,
    ALLOWANCE_ON_FOLD,
    UNKNOWN_EDGE,
    ManufacturingError,
)
from manufacturing.core.geometry import flatten_panel, round_point
from manufacturing.core.model import (
    DEFAULT_POLICY,
    AllowancePolicy,
    CutOutline,
    EdgeRole,
    Panel,
    Pattern,
    SeamEdge,
)
from manufacturing.core.offset import offset_contour


def validate_policy(pattern: Pattern, policy: AllowancePolicy) -> None:
    """`by_edge` doit viser un bord existant, sans valeur sur un pli ni une jambe de pince."""
    panels = {p.id: p for p in pattern.panels}
    for (panel_id, edge_id), value in policy.by_edge.items():
        panel = panels.get(panel_id)
        edge = next((e for e in panel.edges if e.id == edge_id), None) if panel else None
        if edge is None:
            raise ManufacturingError(UNKNOWN_EDGE, f"pièce {panel_id}, bord {edge_id} inconnus")
        if edge.role is EdgeRole.FOLD and value > 0:
            raise ManufacturingError(
                ALLOWANCE_ON_FOLD, f"pièce {panel_id} : le bord {edge_id} est un pli"
            )
        if value > 0 and panel and edge.id in dart_edge_ids(panel, dart_pairs(pattern, panel)):
            raise ManufacturingError(
                ALLOWANCE_ON_DART, f"pièce {panel_id} : le bord {edge_id} est une jambe de pince"
            )


def resolve_allowances(
    panel: Panel, policy: AllowancePolicy, darts: tuple[DartPair, ...] = ()
) -> tuple[float, ...]:
    """Valeur de chaque bord : pli et jambe de pince = 0, sinon `by_edge` > `by_role` > défaut."""
    values: list[float] = []
    dart_edges = dart_edge_ids(panel, darts)
    for edge in panel.edges:
        if edge.role is EdgeRole.FOLD or edge.id in dart_edges:
            values.append(0.0)
        else:
            by_role = policy.by_role.get(edge.role, policy.default_mm)
            values.append(policy.by_edge.get((panel.id, edge.id), by_role))
    return tuple(values)


def cut_outline(
    panel: Panel, policy: AllowancePolicy, darts: tuple[DartPair, ...] = ()
) -> CutOutline:
    """Ligne de couture et ligne de coupe (arrondies à 0,01 mm) d'une pièce.

    Une pince n'est pas découpée : la ligne de coupe la franchit par un pont.
    """
    flat = flatten_panel(panel)
    values = resolve_allowances(panel, policy, darts)
    try:
        bridged, bridged_values = bridge_contour(flat, values, darts)
        cut = offset_contour(bridged, bridged_values)
    except ManufacturingError as error:
        raise ManufacturingError(error.kind, f"pièce {panel.id} : {error.detail}") from error
    seam_edges = tuple(
        SeamEdge(e.id, e.role, tuple(round_point(p) for p in pts), v)
        for e, pts, v in zip(panel.edges, flat, values, strict=True)
    )
    return CutOutline(panel.id, seam_edges, tuple(round_point(p) for p in cut))


def compute_cut_outlines(
    pattern: Pattern, policy: AllowancePolicy = DEFAULT_POLICY
) -> tuple[CutOutline, ...]:
    """Contour de coupe de chaque pièce du patron."""
    validate_policy(pattern, policy)
    return tuple(cut_outline(panel, policy, dart_pairs(pattern, panel)) for panel in pattern.panels)

"""Conversions contrat <-> cœur. Seul endroit qui connaît le format des contrats."""

from atelier_contracts.generated.garment_spec_schema import (
    Anchor,
    BodySide,
    EdgeRef,
    Engine,
    Facing,
    Garment,
    GarmentSpec,
    Landmark,
    PanelPlacement,
    Point,
    Role,
    Seam,
    Zone,
)
from atelier_contracts.generated.garment_spec_schema import (
    Edge as SpecEdge,
)
from atelier_contracts.generated.garment_spec_schema import (
    Notch as SpecNotch,
)
from atelier_contracts.generated.garment_spec_schema import (
    Panel as SpecPanel,
)
from patterning import ENGINE_NAME, ENGINE_VERSION
from patterning.core.model import Edge, Notch, Panel, Pattern, Placement
from patterning.core.model import Seam as CoreSeam
from patterning.spec.request import camel_case


def _point(p: tuple[float, float]) -> Point:
    return Point.model_validate([p[0], p[1]])


def _edge(edge: Edge) -> SpecEdge:
    return SpecEdge.model_validate(
        {
            "id": edge.id,
            "from": _point(edge.start),
            "to": _point(edge.end),
            "controls": [_point(c) for c in edge.controls] or None,
            "role": Role(edge.role.value),
        }
    )


def _panel(panel: Panel) -> SpecPanel:
    return SpecPanel(
        id=panel.id,
        name=panel.name,
        edges=[_edge(e) for e in panel.edges],
        grainline=[_point(panel.grainline[0]), _point(panel.grainline[1])],
        quantity=panel.quantity,
        cutOnFold=panel.cut_on_fold,
        notches=[_notch(n) for n in panel.notches] or None,
        placement=_placement(panel.placement) if panel.placement else None,
    )


def _placement(placement: Placement) -> PanelPlacement:
    return PanelPlacement(
        zone=Zone(placement.zone.value),
        bodySide=BodySide(placement.body_side.value),
        facing=Facing(placement.facing.value),
        anchor=Anchor(
            point=_point(placement.anchor),
            landmark=Landmark(placement.landmark.value),
            offsetMm=placement.offset_mm,
        ),
        clearanceMm=placement.clearance_mm,
    )


def _notch(notch: Notch) -> SpecNotch:
    return SpecNotch(edgeId=notch.edge_id, distanceMm=notch.distance_mm, count=notch.count)


def _seam(seam: CoreSeam) -> Seam:
    return Seam(
        id=seam.id,
        a=EdgeRef(panelId=seam.a[0], edgeId=seam.a[1]),
        b=EdgeRef(panelId=seam.b[0], edgeId=seam.b[1]),
        easeMm=seam.ease_mm or None,
    )


def to_spec(pattern: Pattern) -> GarmentSpec:
    return GarmentSpec(
        specVersion="1.0",
        unit="mm",
        engine=Engine(name=ENGINE_NAME, version=ENGINE_VERSION),
        garment=Garment(type=pattern.garment_type),
        panels=[_panel(p) for p in pattern.panels],
        seams=[_seam(s) for s in pattern.seams],
        estimatedMeasurements=sorted(camel_case(n) for n in pattern.estimated_measurements) or None,
    )

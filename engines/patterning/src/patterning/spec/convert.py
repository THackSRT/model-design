"""Conversions contrat <-> cœur. Seul endroit qui connaît le format des contrats."""

from atelier_contracts.generated.garment_request_schema import GarmentRequest
from atelier_contracts.generated.garment_spec_schema import (
    Edge as SpecEdge,
)
from atelier_contracts.generated.garment_spec_schema import (
    EdgeRef,
    Engine,
    Garment,
    GarmentSpec,
    Point,
    Role,
    Seam,
)
from atelier_contracts.generated.garment_spec_schema import (
    Panel as SpecPanel,
)
from atelier_contracts.generated.measurement_set_schema import MeasurementSet
from patterning import ENGINE_NAME, ENGINE_VERSION
from patterning.core.model import Edge, Panel, Pattern
from patterning.core.straight_skirt import SkirtInputs


def to_skirt_inputs(measurements: MeasurementSet, garment: GarmentRequest) -> SkirtInputs:
    params = garment.params
    return SkirtInputs(
        stature_mm=measurements.statureMm,
        waist_girth_mm=measurements.waistGirthMm,
        hip_girth_mm=measurements.hipGirthMm,
        length_mm=params.lengthMm,
        waist_ease_mm=params.waistEaseMm if params.waistEaseMm is not None else 10,
        hip_ease_mm=params.hipEaseMm if params.hipEaseMm is not None else 40,
        hem_flare_mm=params.hemFlareMm if params.hemFlareMm is not None else 0,
    )


def _point(p: tuple[float, float]) -> Point:
    return Point([p[0], p[1]])


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
    )


def to_spec(pattern: Pattern) -> GarmentSpec:
    return GarmentSpec(
        specVersion="1.0",
        unit="mm",
        engine=Engine(name=ENGINE_NAME, version=ENGINE_VERSION),
        garment=Garment(type=pattern.garment_type),
        panels=[_panel(p) for p in pattern.panels],
        seams=[
            Seam(
                id=s.id,
                a=EdgeRef(panelId=s.a[0], edgeId=s.a[1]),
                b=EdgeRef(panelId=s.b[0], edgeId=s.b[1]),
            )
            for s in pattern.seams
        ],
    )

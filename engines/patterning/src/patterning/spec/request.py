"""Requête du contrat -> entrées du cœur (mesures brutes, type, paramètres numériques à plat)."""

import re
from dataclasses import dataclass, fields

from atelier_contracts.generated.garment_request_schema import GarmentRequest
from atelier_contracts.generated.measurement_set_schema import MeasurementSet
from patterning.core.body import RawMeasurements

_CAMEL_BOUNDARY = re.compile(r"(?<=[a-z0-9])(?=[A-Z])")


@dataclass(frozen=True)
class DraftInputs:
    garment_type: str
    measurements: RawMeasurements
    params: dict[str, float]


def snake_case(name: str) -> str:
    return _CAMEL_BOUNDARY.sub("_", name).lower()


def camel_case(name: str) -> str:
    head, *rest = name.split("_")
    return head + "".join(word.capitalize() for word in rest)


def to_raw_measurements(measurements: MeasurementSet) -> RawMeasurements:
    known = {f.name for f in fields(RawMeasurements)}
    values = {snake_case(name): value for name, value in measurements.model_dump().items()}
    return RawMeasurements(
        sex=measurements.sex.value,
        **{name: value for name, value in values.items() if name in known and name != "sex"},
    )


def _flatten(values: dict[str, object], prefix: str = "") -> dict[str, float]:
    flat: dict[str, float] = {}
    for name, value in values.items():
        key = prefix + snake_case(name)
        if isinstance(value, dict):
            flat.update(_flatten(value, key + "_"))
        elif isinstance(value, int | float) and not isinstance(value, bool):
            flat[key] = value
    return flat


def to_draft_inputs(measurements: MeasurementSet, garment: GarmentRequest) -> DraftInputs:
    request = garment.root
    params = request.params.model_dump(exclude_none=True, mode="json")
    return DraftInputs(request.type, to_raw_measurements(measurements), _flatten(params))

"""Chaque mesure facultative du contrat arrive au cœur, et revient sous son nom dans la sortie."""

from dataclasses import fields

import pytest

from atelier_contracts.generated.measurement_set_schema import MeasurementSet, Sex
from patterning.core.body import RawMeasurements
from patterning.spec.request import camel_case, snake_case, to_raw_measurements

REQUIRED = {"sex", "statureMm", "chestGirthMm", "waistGirthMm", "hipGirthMm"}
OPTIONAL = sorted(name for name in MeasurementSet.model_fields if name not in REQUIRED)
CORE_FIELDS = {f.name for f in fields(RawMeasurements)}
# Mesures du contrat qu'aucun tracé n'exploite encore (ni manche ni corsage) : ignorées exprès.
UNUSED_BY_CORE = {
    "neckGirthMm",
    "upperArmGirthMm",
    "calfGirthMm",
    "ankleGirthMm",
}


def _measurement_set(**extra: int) -> MeasurementSet:
    return MeasurementSet.model_construct(
        sex=Sex.female,
        statureMm=1650,
        chestGirthMm=880,
        waistGirthMm=640,
        hipGirthMm=960,
        **extra,
    )


@pytest.mark.parametrize("name", OPTIONAL)
def test_optional_measurement_reaches_the_core_or_is_declared_unused(name: str) -> None:
    if name in UNUSED_BY_CORE:
        assert snake_case(name) not in CORE_FIELDS
        return
    raw = to_raw_measurements(_measurement_set(**{name: 777}))
    assert getattr(raw, snake_case(name)) == 777


@pytest.mark.parametrize("name", OPTIONAL)
def test_measurement_name_comes_back_unchanged_in_estimated_measurements(name: str) -> None:
    assert camel_case(snake_case(name)) == name

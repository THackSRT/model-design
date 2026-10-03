"""Toute spécification produite reste dans la borne du contrat (±10 000 mm), mesures aux bornes."""

from typing import Any

from hypothesis import assume, given, settings
from hypothesis import strategies as st

from atelier_contracts.generated.garment_request_schema import GarmentRequest
from atelier_contracts.generated.garment_spec_schema import GarmentSpec, Panel
from atelier_contracts.generated.measurement_set_schema import MeasurementSet
from patterning.core.drafting import draft
from patterning.core.errors import DraftingError, PatternCheckError
from patterning.spec.convert import to_spec
from patterning.spec.request import to_draft_inputs

SETTINGS = settings(max_examples=80, deadline=None)
LIMIT_MM = 10_000


def _in(low: int, high: int) -> st.SearchStrategy[int]:
    """Une valeur du contrat : surtout les bornes, parfois l'intérieur."""
    return st.one_of(st.sampled_from([low, high]), st.integers(low, high))


MEASUREMENTS = st.fixed_dictionaries(
    {
        "sex": st.sampled_from(["female", "male"]),
        "statureMm": _in(900, 2300),
        "chestGirthMm": _in(500, 1800),
        "waistGirthMm": _in(400, 1800),
        "hipGirthMm": _in(600, 1900),
        "bustGirthMm": _in(600, 1800),
        "backWaistLengthMm": _in(300, 600),
        "crotchHeightMm": _in(400, 1100),
    }
)
SLEEVE = st.fixed_dictionaries(
    {"lengthMm": _in(100, 900), "capEaseMm": _in(0, 40), "hemGirthMm": _in(150, 600)}
)
REQUESTS = st.one_of(
    st.fixed_dictionaries(
        {
            "type": st.just("straight-skirt"),
            "params": st.fixed_dictionaries(
                {
                    "lengthMm": _in(300, 1300),
                    "waistEaseMm": _in(0, 80),
                    "hipEaseMm": _in(0, 200),
                    "hemFlareMm": _in(0, 200),
                }
            ),
        }
    ),
    st.fixed_dictionaries(
        {
            "type": st.just("circle-skirt"),
            "params": st.fixed_dictionaries(
                {
                    "lengthMm": _in(300, 1300),
                    "waistEaseMm": _in(0, 80),
                    "circleFraction": st.sampled_from([0.25, 0.5, 1.0]),
                    "waistbandWidthMm": st.one_of(st.just(0), _in(20, 80)),
                }
            ),
        }
    ),
    st.fixed_dictionaries(
        {
            "type": st.just("trousers"),
            "params": st.fixed_dictionaries(
                {
                    "lengthMm": _in(300, 1300),
                    "waistEaseMm": _in(0, 80),
                    "hipEaseMm": _in(20, 200),
                    "hemGirthMm": _in(250, 900),
                }
            ),
        }
    ),
    st.fixed_dictionaries(
        {
            "type": st.just("bodice"),
            "params": st.fixed_dictionaries(
                {
                    "lengthBelowWaistMm": _in(0, 400),
                    "bustEaseMm": _in(0, 200),
                    "waistEaseMm": _in(0, 200),
                    "frontNeckDepthMm": _in(0, 250),
                    "backNeckDepthMm": _in(0, 250),
                },
                optional={"sleeve": SLEEVE},
            ),
        }
    ),
)


def _coordinates(panel: Panel) -> list[float]:
    points: list[Any] = [panel.grainline[0], panel.grainline[1]]
    for edge in panel.edges:
        points += [edge.from_, edge.to, *(edge.controls or [])]
    if panel.placement is not None:
        points.append(panel.placement.anchor.point)
    return [value for point in points for value in point.model_dump()]


def _spec(measurements: dict[str, Any], request: dict[str, Any]) -> GarmentSpec:
    inputs = to_draft_inputs(
        MeasurementSet.model_validate(measurements), GarmentRequest.model_validate(request)
    )
    try:
        pattern = draft(inputs.garment_type, inputs.measurements, inputs.params)
    except (DraftingError, PatternCheckError):
        assume(False)  # combinaison de mesures refusée par le tracé : hors sujet ici
        raise
    return to_spec(pattern)


@SETTINGS
@given(MEASUREMENTS, REQUESTS)
def test_every_coordinate_of_the_spec_stays_within_the_contract_bound(
    measurements: dict[str, Any], request: dict[str, Any]
) -> None:
    spec = _spec(measurements, request)
    assert spec.panels
    for panel in spec.panels:
        assert all(abs(value) <= LIMIT_MM for value in _coordinates(panel))

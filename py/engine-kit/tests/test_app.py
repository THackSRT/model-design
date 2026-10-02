import json
from typing import Any

from fastapi.testclient import TestClient
from pydantic import BaseModel, Field

from atelier_engine_kit import EngineError, EngineInfo, create_engine_app


def make_client() -> TestClient:
    app = create_engine_app(EngineInfo(name="demo", version="1.2.3"))

    @app.get("/boom")
    def boom() -> None:
        raise EngineError(kind="cannot-draft", detail="taille trop petite")

    return TestClient(app)


def test_health_reports_engine_version() -> None:
    response = make_client().get("/health")
    assert response.json() == {"status": "ok", "engineVersion": "1.2.3"}


def test_engine_problem_becomes_rfc9457_response() -> None:
    response = make_client().get("/boom")
    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    assert response.json()["type"] == "/problems/cannot-draft"


class Item(BaseModel):
    name: str
    size: int = Field(ge=0, le=10)


class Order(BaseModel):
    items: list[Item]


def validating_client() -> TestClient:
    app = create_engine_app(EngineInfo(name="demo", version="1"))

    @app.post("/order")
    def order(body: Order) -> dict[str, int]:
        return {"count": len(body.items)}

    return TestClient(app)


def _problem(body: dict[str, Any]) -> dict[str, Any]:
    response = validating_client().post("/order", json=body)
    assert response.status_code == 422
    assert response.headers["content-type"] == "application/problem+json"
    problem = response.json()
    assert problem["type"] == "/problems/invalid-request"
    assert problem["status"] == 422
    assert problem["title"]
    return dict(problem)


def test_missing_field_is_an_invalid_request() -> None:
    problem = _problem({"items": [{"size": 3}]})
    assert problem["errors"] == [{"path": "items[0].name", "constraint": "missing"}]


def test_out_of_bounds_and_wrong_type_never_echo_the_received_value() -> None:
    secret = 98765
    problem = _problem({"items": [{"name": "a", "size": secret}, {"name": 4242.5, "size": 1}]})
    assert {e["constraint"] for e in problem["errors"]} == {"less_than_equal", "string_type"}
    text = json.dumps(problem)
    assert str(secret) not in text and "4242" not in text


def test_listed_errors_are_bounded() -> None:
    problem = _problem({"items": [{"size": 1}] * 50})
    assert len(problem["errors"]) == 20
    assert problem["detail"] == "50 erreur(s) de validation"

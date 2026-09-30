from fastapi.testclient import TestClient

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

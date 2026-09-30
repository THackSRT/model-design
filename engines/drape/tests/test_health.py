from fastapi.testclient import TestClient

from drape import ENGINE_VERSION
from drape.main import create_app


def test_health_reports_engine_version() -> None:
    response = TestClient(create_app()).get("/health")
    assert response.json() == {"status": "ok", "engineVersion": ENGINE_VERSION}

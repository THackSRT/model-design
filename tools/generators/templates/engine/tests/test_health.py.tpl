from fastapi.testclient import TestClient

from __name_snake__ import ENGINE_VERSION
from __name_snake__.main import create_app


def test_health_reports_engine_version() -> None:
    response = TestClient(create_app()).get("/health")
    assert response.json() == {"status": "ok", "engineVersion": ENGINE_VERSION}

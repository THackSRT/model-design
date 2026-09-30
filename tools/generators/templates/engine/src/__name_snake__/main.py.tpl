"""Point d'entrée : `uv run uvicorn __name_snake__.main:app`."""

from fastapi import FastAPI

from atelier_engine_kit import EngineInfo, create_engine_app
from atelier_engine_kit.logging import configure_logging
from __name_snake__ import ENGINE_NAME, ENGINE_VERSION
from __name_snake__.api.routes import router


def create_app() -> FastAPI:
    app = create_engine_app(EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION))
    app.include_router(router)
    return app


configure_logging()
app = create_app()

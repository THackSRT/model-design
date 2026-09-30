"""Point d'entrée : `uv run uvicorn patterning.main:app --port 3201`."""

from fastapi import FastAPI

from atelier_engine_kit import EngineInfo, create_engine_app
from atelier_engine_kit.logging import configure_logging
from patterning import ENGINE_NAME, ENGINE_VERSION
from patterning.api.routes import router


def create_app() -> FastAPI:
    app = create_engine_app(EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION))
    app.include_router(router)
    return app


configure_logging()
app = create_app()

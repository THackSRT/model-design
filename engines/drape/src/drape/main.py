"""Point d'entrée : `uv run uvicorn drape.main:app`."""

from fastapi import FastAPI

from atelier_engine_kit import EngineInfo, create_engine_app
from atelier_engine_kit.logging import configure_logging
from drape import ENGINE_NAME, ENGINE_VERSION
from drape.api.routes import router


def create_app() -> FastAPI:
    app = create_engine_app(EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION))
    app.include_router(router)
    return app


configure_logging()
app = create_app()

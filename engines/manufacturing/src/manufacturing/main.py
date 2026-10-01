"""Point d'entrée : `uv run uvicorn manufacturing.main:app`."""

from fastapi import FastAPI

from atelier_engine_kit import EngineInfo, create_engine_app
from atelier_engine_kit.logging import configure_logging
from manufacturing import ENGINE_NAME, ENGINE_VERSION
from manufacturing.api.cut_patterns import router as cut_patterns_router
from manufacturing.api.cutting_plans import router as cutting_plans_router
from manufacturing.api.exports import router as exports_router
from manufacturing.api.graded_patterns import router as graded_patterns_router


def create_app() -> FastAPI:
    app = create_engine_app(EngineInfo(name=ENGINE_NAME, version=ENGINE_VERSION))
    app.include_router(cut_patterns_router)
    app.include_router(cutting_plans_router)
    app.include_router(graded_patterns_router)
    app.include_router(exports_router)
    return app


configure_logging()
app = create_app()

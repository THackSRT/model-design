"""Fabrique de l'application HTTP d'un moteur : santé, erreurs, identité du moteur."""

from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from atelier_engine_kit.problems import EngineError

PROBLEM_JSON = "application/problem+json"


@dataclass(frozen=True)
class EngineInfo:
    name: str
    version: str


def create_engine_app(info: EngineInfo) -> FastAPI:
    app = FastAPI(title=f"Moteur {info.name}", version=info.version)

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "engineVersion": info.version}

    @app.exception_handler(EngineError)
    def on_problem(_: Request, problem: EngineError) -> JSONResponse:
        return JSONResponse(
            problem.as_problem(), status_code=problem.status, media_type=PROBLEM_JSON
        )

    return app

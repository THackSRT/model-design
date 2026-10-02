"""Fabrique de l'application HTTP d'un moteur : santé, erreurs, identité du moteur."""

from dataclasses import dataclass

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from atelier_engine_kit.problems import EngineError

PROBLEM_JSON = "application/problem+json"
INVALID_REQUEST = "invalid-request"
MAX_LISTED_ERRORS = 20


@dataclass(frozen=True)
class EngineInfo:
    name: str
    version: str


def _json_pointer(loc: tuple[int | str, ...]) -> str:
    """Chemin JSON de l'erreur, sans le préfixe « body »."""
    parts = loc[1:] if loc and loc[0] == "body" else loc
    return "".join(f"[{p}]" if isinstance(p, int) else f".{p}" for p in parts).lstrip(".") or "$"


def invalid_request_problem(error: RequestValidationError) -> dict[str, object]:
    """Problème RFC 9457 d'une requête hors schéma. Jamais la valeur reçue (mesures de client)."""
    errors = error.errors()
    return {
        "type": f"/problems/{INVALID_REQUEST}",
        "title": "invalid request",
        "status": 422,
        "detail": f"{len(errors)} erreur(s) de validation",
        "errors": [
            {"path": _json_pointer(tuple(e["loc"])), "constraint": e["type"]}
            for e in errors[:MAX_LISTED_ERRORS]
        ],
    }


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

    @app.exception_handler(RequestValidationError)
    def on_invalid_request(_: Request, error: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            invalid_request_problem(error), status_code=422, media_type=PROBLEM_JSON
        )

    return app

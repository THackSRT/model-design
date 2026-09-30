"""Erreurs métier prévues d'un moteur, traduites en réponses RFC 9457."""

from dataclasses import dataclass


@dataclass(frozen=True)
class EngineError(Exception):
    """Entrées valides mais impossibles à traiter (ex. un patron impossible à tracer)."""

    kind: str
    detail: str
    status: int = 422

    def as_problem(self) -> dict[str, object]:
        return {
            "type": f"/problems/{self.kind}",
            "title": self.kind.replace("-", " "),
            "status": self.status,
            "detail": self.detail,
        }

"""Erreurs du cœur : une entrée impossible à tracer (422) et un bogue de tracé (500)."""


class DraftingError(ValueError):
    """Entrées valides mais impossibles à tracer."""

    def __init__(self, kind: str, detail: str) -> None:
        super().__init__(detail)
        self.kind = kind
        self.detail = detail


class PatternCheckError(RuntimeError):
    """Un patron tracé viole un invariant : bogue du tracé, jamais une erreur de l'appelant."""

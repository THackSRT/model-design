"""Erreurs métier du cœur : le `kind` est le suffixe du type RFC 9457 porté par l'API."""

OPEN_CONTOUR = "open-contour"
UNKNOWN_EDGE = "unknown-edge"
ALLOWANCE_ON_FOLD = "allowance-on-fold"
ALLOWANCE_ON_DART = "allowance-on-dart"
ADJACENT_DARTS = "adjacent-darts"
NOTCH_OUTSIDE_EDGE = "notch-outside-edge"
FOLD_EDGE_MISSING = "fold-edge-missing"
CUT_LINE_SELF_INTERSECTS = "cut-line-self-intersects"
SIZES_MISMATCH = "sizes-mismatch"


class ManufacturingError(Exception):
    """Entrée inutilisable ; le détail cite des identifiants, jamais de coordonnées."""

    def __init__(self, kind: str, detail: str) -> None:
        super().__init__(f"{kind}: {detail}")
        self.kind = kind
        self.detail = detail

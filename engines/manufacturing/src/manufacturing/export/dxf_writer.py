"""Écriture DXF R12 ASCII : paires code de groupe / valeur, sans handle (sortie reproductible).

Fins de ligne `\r\n` (usage d'AutoCAD), encodage cp1252 (`$DWGCODEPAGE` = `ANSI_1252`).
"""

import re

from manufacturing.core.model import Point

NEWLINE = "\r\n"
ENCODING = "cp1252"
Z = 0.0

_CONTROL = re.compile(r"[\x00-\x1f\x7f]")


def dxf_text(value: str) -> str:
    """Texte sûr : sans caractère de contrôle (un saut de ligne créerait des paires de groupe)."""
    return _CONTROL.sub("", value)


def num(value: float) -> str:
    text = f"{value:.2f}"
    return "0.00" if text == "-0.00" else text


class DxfWriter:
    """Accumule des paires (code, valeur) ; `to_bytes` rend le fichier."""

    def __init__(self) -> None:
        self._lines: list[str] = []

    def pair(self, code: int, value: str | int | float) -> None:
        if isinstance(value, float):
            text = num(value)
        elif isinstance(value, str):
            text = dxf_text(value)
        else:
            text = str(value)
        self._lines.append(f"{code:>3}")
        self._lines.append(text)

    def point(self, p: Point, base: int = 10) -> None:
        self.pair(base, p[0])
        self.pair(base + 10, p[1])
        self.pair(base + 20, Z)

    def begin(self, name: str) -> None:
        self.pair(0, "SECTION")
        self.pair(2, name)

    def end(self) -> None:
        self.pair(0, "ENDSEC")

    def variable(self, name: str, code: int, value: str | int | float) -> None:
        self.pair(9, name)
        self.pair(code, value)

    def to_bytes(self) -> bytes:
        self.pair(0, "EOF")
        return (NEWLINE.join(self._lines) + NEWLINE).encode(ENCODING, errors="replace")

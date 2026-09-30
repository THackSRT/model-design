# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import Field, RootModel


class SizeLabel(RootModel[str]):
    root: str = Field(
        ...,
        description="Nom de taille ou repère court (« 38 », « M », « MOD-002 »). Jeu de caractères restreint : il est écrit tel quel dans les exports (SVG, PDF, DXF). Jamais de nom de client.",
        pattern="^[A-Za-z0-9][A-Za-z0-9 ._+/-]{0,23}$",
        title="SizeLabel",
    )

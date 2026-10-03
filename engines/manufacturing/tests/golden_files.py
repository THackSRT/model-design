"""Lecture et écriture des références golden, octet pour octet, sans conversion de fins de ligne.

Le mode texte de Python écrit CRLF sous Windows ; les références texte (JSON, SVG) sont en LF sur
tous les postes (`.gitattributes`), le DXF en CRLF et le PDF binaires. On passe donc toujours par
des octets.
"""

from pathlib import Path


def write_text_lf(path: Path, text: str) -> None:
    """Écrit `text` en UTF-8 avec des fins de ligne LF, quel que soit le système."""
    path.write_bytes(text.replace("\r\n", "\n").encode("utf-8"))


def read_text_exact(path: Path) -> str:
    """Lit le fichier en UTF-8 sans traduire les fins de ligne (un CRLF reste visible)."""
    return path.read_bytes().decode("utf-8")

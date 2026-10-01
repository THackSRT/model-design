"""Écrivain PDF 1.4 minimal : pages A4, flux non compressés, police Helvetica standard.

Pur et déterministe : pas de date, pas de `/ID`, pas de `/Info`, pas de compression (la sortie de
zlib varie selon les postes). Le dessin se fait en millimètres (matrice `cm` de 72/25,4 en tête de
flux) ; l'origine est le coin bas gauche de la page, y vers le haut.
"""

import math

from manufacturing.core.model import Point

PAGE_WIDTH_MM = 210.0
PAGE_HEIGHT_MM = 297.0
PT_PER_MM = 72.0 / 25.4
MEDIA_BOX = "[0 0 595.276 841.890]"
HELVETICA_AVERAGE_EM = 0.55  # largeur moyenne d'un caractère, pour centrer ou aligner à droite

_HEADER = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
_FIRST_PAGE_ID = 4  # 1 catalogue, 2 arbre des pages, 3 police ; ensuite page puis flux, par page


def num(value: float) -> str:
    text = f"{value:.3f}"
    return "0.000" if text == "-0.000" else text


def pdf_string(content: str) -> bytes:
    """Chaîne littérale PDF en cp1252 : hors cp1252 et caractères de contrôle donnent `?`."""
    cleaned = "".join("?" if ord(ch) < 0x20 or ord(ch) == 0x7F else ch for ch in content)
    raw = cleaned.encode("cp1252", errors="replace")
    for char in (b"\\", b"(", b")"):
        raw = raw.replace(char, b"\\" + char)
    return b"(" + raw + b")"


def text_width_mm(content: str, size_mm: float) -> float:
    return len(content) * size_mm * HELVETICA_AVERAGE_EM


class Canvas:
    """Opérateurs de dessin d'une page, en millimètres."""

    def __init__(self) -> None:
        self._ops: list[bytes] = []

    def raw(self, operator: str) -> None:
        self._ops.append(operator.encode("ascii"))

    def save(self) -> None:
        self.raw("q")

    def restore(self) -> None:
        self.raw("Q")

    def translate(self, dx: float, dy: float) -> None:
        self.raw(f"1 0 0 1 {num(dx)} {num(dy)} cm")

    def clip_rect(self, x: float, y: float, w: float, h: float) -> None:
        self.raw(f"{num(x)} {num(y)} {num(w)} {num(h)} re W n")

    def rect(self, x: float, y: float, w: float, h: float) -> None:
        self.raw(f"{num(x)} {num(y)} {num(w)} {num(h)} re S")

    def width(self, stroke_mm: float) -> None:
        self.raw(f"{num(stroke_mm)} w")

    def dash(self, on_mm: float | None = None, off_mm: float | None = None) -> None:
        if on_mm is None or off_mm is None:
            self.raw("[] 0 d")
        else:
            self.raw(f"[{num(on_mm)} {num(off_mm)}] 0 d")

    def line(self, a: Point, b: Point) -> None:
        self.raw(f"{num(a[0])} {num(a[1])} m {num(b[0])} {num(b[1])} l S")

    def polygon(self, points: tuple[Point, ...]) -> None:
        if len(points) < 2:
            return
        first, *rest = points
        parts = [f"{num(first[0])} {num(first[1])} m"]
        parts += [f"{num(x)} {num(y)} l" for x, y in rest]
        self.raw(" ".join(parts) + " s")

    def text(self, p: Point, content: str, size_mm: float) -> None:
        head = f"BT /F1 {num(size_mm)} Tf {num(p[0])} {num(p[1])} Td ".encode("ascii")
        self._ops.append(head + pdf_string(content) + b" Tj ET")

    def text_centered(self, p: Point, content: str, size_mm: float) -> None:
        shift = text_width_mm(content, size_mm) / 2
        self.text((p[0] - shift, p[1]), content, size_mm)

    def text_ended(self, p: Point, content: str, size_mm: float) -> None:
        self.text((p[0] - text_width_mm(content, size_mm), p[1]), content, size_mm)

    def arrow_head(self, tip: Point, towards: Point, length_mm: float) -> None:
        angle = math.atan2(towards[1] - tip[1], towards[0] - tip[0])
        for sign in (1, -1):
            barb = (
                tip[0] + length_mm * math.cos(angle + sign * math.radians(25)),
                tip[1] + length_mm * math.sin(angle + sign * math.radians(25)),
            )
            self.line(tip, barb)

    def stream(self) -> bytes:
        scale = f"{PT_PER_MM:.6f}"
        head = f"{scale} 0 0 {scale} 0 0 cm\n".encode("ascii")
        return head + b"\n".join(self._ops) + b"\n"


def _object(number: int, body: bytes) -> bytes:
    return f"{number} 0 obj\n".encode("ascii") + body + b"\nendobj\n"


def _stream_object(number: int, data: bytes) -> bytes:
    body = f"<< /Length {len(data)} >>\nstream\n".encode("ascii") + data + b"\nendstream"
    return _object(number, body)


class PdfDocument:
    """Assemble les pages (une par `Canvas`) en un fichier PDF."""

    def __init__(self) -> None:
        self._pages: list[Canvas] = []

    def add_page(self) -> Canvas:
        canvas = Canvas()
        self._pages.append(canvas)
        return canvas

    def build(self) -> bytes:
        count = len(self._pages)
        page_ids = [_FIRST_PAGE_ID + 2 * i for i in range(count)]
        kids = " ".join(f"{i} 0 R" for i in page_ids)
        objects = [
            _object(1, b"<< /Type /Catalog /Pages 2 0 R >>"),
            _object(2, f"<< /Type /Pages /Kids [{kids}] /Count {count} >>".encode("ascii")),
            _object(
                3,
                b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
                b"/Encoding /WinAnsiEncoding >>",
            ),
        ]
        for page_id, canvas in zip(page_ids, self._pages, strict=True):
            page = (
                f"<< /Type /Page /Parent 2 0 R /MediaBox {MEDIA_BOX} "
                f"/Resources << /Font << /F1 3 0 R >> >> /Contents {page_id + 1} 0 R >>"
            )
            objects.append(_object(page_id, page.encode("ascii")))
            objects.append(_stream_object(page_id + 1, canvas.stream()))
        return _assemble(objects)


def _assemble(objects: list[bytes]) -> bytes:
    out = bytearray(_HEADER)
    offsets: list[int] = []
    for obj in objects:
        offsets.append(len(out))
        out += obj
    start = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode("ascii")
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode("ascii")
    trailer = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n"
    out += trailer.encode("ascii")
    return bytes(out)

"""PDF A4 tuilé : structure, pages, tuilage, texte, carré de contrôle."""

import io
import math
import re
from dataclasses import replace

from pypdf import PdfReader

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.model import DEFAULT_POLICY, CutPiece
from manufacturing.export.pdf_tiles import (
    TILE_H_MM,
    TILE_W_MM,
    render_pdf,
    row_letters,
    tile_name,
)
from manufacturing.export.pdf_writer import pdf_string
from manufacturing.export.sheet import ExportJob, layout
from tests.builders import a_pattern, rectangle


def _job(*sizes: tuple[float, float], name: str | None = None) -> ExportJob:
    panels = [rectangle(w, h, f"r{i}") for i, (w, h) in enumerate(sizes)]
    pieces = compute_cut_pieces(a_pattern(*panels), DEFAULT_POLICY, (), False)
    if name is not None:
        pieces = tuple(replace(p, name=name) for p in pieces)
    return ExportJob("skirt", pieces, "38", "MOD-002")


def _pages(pdf: bytes) -> PdfReader:
    return PdfReader(io.BytesIO(pdf))


def _expected_pages(pieces: tuple[CutPiece, ...]) -> int:
    sheet = layout(pieces)
    return 1 + math.ceil(sheet.width_mm / TILE_W_MM) * math.ceil(sheet.height_mm / TILE_H_MM)


def test_structure_is_pdf_1_4_with_exact_xref() -> None:
    pdf = render_pdf(_job((100, 100)))
    assert pdf.startswith(b"%PDF-1.4\n%")
    assert pdf.endswith(b"%%EOF\n")
    assert b"/Info" not in pdf and b"/ID" not in pdf and b"/Filter" not in pdf
    assert b"/BaseFont /Helvetica /Encoding /WinAnsiEncoding" in pdf
    start = int(re.search(rb"startxref\n(\d+)\n", pdf).group(1))  # type: ignore[union-attr]
    assert pdf[start : start + 4] == b"xref"
    size = int(re.search(rb"/Size (\d+)", pdf).group(1))  # type: ignore[union-attr]
    entries = pdf[start:].split(b"\n")[3 : 3 + size - 1]
    for number, entry in enumerate(entries, start=1):
        offset = int(entry[:10])
        assert pdf[offset:].startswith(f"{number} 0 obj\n".encode())


def test_page_count_and_media_box() -> None:
    job = _job((100, 100), (500, 300))
    reader = _pages(render_pdf(job))
    assert len(reader.pages) == _expected_pages(job.pieces)
    for page in reader.pages:
        box = page.mediabox
        assert (float(box.width), float(box.height)) == (595.276, 841.89)


def test_tall_sheet_has_several_rows() -> None:
    job = _job((100, 700))
    assert len(_pages(render_pdf(job)).pages) == _expected_pages(job.pieces) > 5


def test_second_page_is_tile_a1() -> None:
    reader = _pages(render_pdf(_job((100, 100))))
    assert "A1" in reader.pages[1].extract_text()


def test_tile_names() -> None:
    assert [row_letters(i) for i in (0, 25, 26, 27)] == ["A", "Z", "AA", "AB"]
    assert tile_name(1, 2) == "B3"


def test_each_page_is_scaled_to_millimetres() -> None:
    pdf = render_pdf(_job((100, 100)))
    assert pdf.count(b"2.834646 0 0 2.834646 0 0 cm") == len(_pages(pdf).pages)


def test_control_square_is_100_mm() -> None:
    page = _pages(render_pdf(_job((100, 100)))).pages[0]
    stream = page.get_contents().get_data().decode("latin-1")  # type: ignore[union-attr]
    assert stream.startswith("2.834646 0 0 2.834646 0 0 cm")
    assert "10.000 10.000 100.000 100.000 re S" in stream
    assert "(100 mm)" in stream


def test_title_page_text() -> None:
    text = _pages(render_pdf(_job((100, 100)))).pages[0].extract_text()
    assert "MOD-002" in text and "skirt" in text


def test_string_escaping_and_encoding() -> None:
    assert pdf_string("a\\b(c)") == b"(a\\\\b\\(c\\))"
    assert pdf_string("é\U0001f600") == b"(\xe9?)"
    assert pdf_string("a\nb") == b"(a?b)"


def test_piece_name_with_parentheses_and_emoji_stays_readable() -> None:
    pdf = render_pdf(_job((100, 100), name="Devant (é) \U0001f600"))
    text = _pages(pdf).pages[1].extract_text()
    assert "(é)" in text


def test_output_is_deterministic() -> None:
    job = _job((100, 100), (500, 300))
    assert render_pdf(job) == render_pdf(job)

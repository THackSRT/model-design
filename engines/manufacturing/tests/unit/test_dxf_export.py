"""Export DXF-AAMA : sections, calques, blocs, sécurité des textes, déterminisme."""

from dataclasses import replace

from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.model import CutPiece
from manufacturing.export.dxf_aama import block_names, render_dxf
from manufacturing.export.dxf_writer import dxf_text, num
from manufacturing.export.sheet import ExportJob, layout
from tests.builders import a_pattern, rectangle, skirt_pattern
from tests.dxf_reader import Entity, blocks, header, read_pairs, sections


def _pieces() -> tuple[CutPiece, ...]:
    return compute_cut_pieces(skirt_pattern())


def _job(size_label: str | None = None, reference: str | None = None) -> ExportJob:
    return ExportJob("straight-skirt", _pieces(), size_label=size_label, reference=reference)


def _count(entities: list[Entity], kind: str, layer: str) -> int:
    return sum(1 for e in entities if e.kind == kind and e.layer == layer)


def test_header_declares_version_units_code_page_and_extents() -> None:
    job = _job()
    head = header(render_dxf(job))
    assert head["$ACADVER"] == [(1, "AC1009")]
    assert head["$MEASUREMENT"] == [(70, "1")]
    assert head["$DWGCODEPAGE"] == [(3, "ANSI_1252")]
    assert head["$EXTMIN"] == [(10, "0.00"), (20, "0.00"), (30, "0.00")]
    sheet = layout(job.pieces)
    assert head["$EXTMAX"][:2] == [(10, num(sheet.width_mm)), (20, num(sheet.height_mm))]


def test_tables_declare_linetype_and_used_layers() -> None:
    content = render_dxf(_job())
    tables = sections(content)["TABLES"]
    assert [e.first(2) for e in tables if e.kind == "LTYPE"] == ["CONTINUOUS"]
    layers = {e.first(2) for e in tables if e.kind == "LAYER"}
    assert {"1", "2", "3", "4", "6", "7", "14"} <= layers
    used = {e.layer for ents in blocks(content).values() for e in ents}
    assert used <= layers


def test_sections_are_in_order_ends_with_eof_and_has_no_handle() -> None:
    pairs = read_pairs(render_dxf(_job()))
    names = [v for c, v in pairs if c == 2 and v in {"HEADER", "TABLES", "BLOCKS", "ENTITIES"}]
    assert names == ["HEADER", "TABLES", "BLOCKS", "ENTITIES"]
    assert pairs[-1] == (0, "EOF")
    assert all(code != 5 for code, _ in pairs)


def test_one_block_and_one_insert_per_piece_at_its_sheet_offset() -> None:
    job = _job(size_label="38")
    content = render_dxf(job)
    assert len(blocks(content)) == len(job.pieces)
    inserts = [e for e in sections(content)["ENTITIES"] if e.kind == "INSERT"]
    offsets = layout(job.pieces).offsets
    assert [(e.first(10), e.first(20)) for e in inserts] == [(num(x), num(y)) for x, y in offsets]
    assert [e.first(2) for e in inserts] == block_names(job.pieces)


def test_header_texts() -> None:
    entities = sections(render_dxf(_job("38", "MOD-002")))["ENTITIES"]
    texts = [e.first(1) for e in entities if e.kind == "TEXT"]
    assert texts == ["Style Name: MOD-002", "Sample Size: 38", "Units: METRIC"]
    plain = sections(render_dxf(_job()))["ENTITIES"]
    assert plain[0].first(1) == "Style Name: straight-skirt"


def test_block_content_follows_the_pieces() -> None:
    job = _job(size_label="38")
    by_block = blocks(render_dxf(job))
    for piece, name in zip(job.pieces, block_names(job.pieces), strict=True):
        entities = by_block[name]
        polylines = [e for e in entities if e.kind == "POLYLINE"]
        assert [(p.layer, p.first(70)) for p in polylines] == [("1", "1"), ("14", "1")]
        assert _count(entities, "VERTEX", "1") == len(piece.outline.cut_line)
        assert _count(entities, "VERTEX", "14") == len(piece.outline.seam_line)
        assert _count(entities, "LINE", "4") == sum(m.count for m in piece.notches)
        assert _count(entities, "LINE", "7") == 1
        assert _count(entities, "LINE", "6") == (1 if piece.cut_on_fold else 0)
        texts = [e.first(1) for e in entities if e.kind == "TEXT"]
        assert texts == [f"Piece Name: {piece.name}", f"Quantity: {piece.quantity}", "Size: 38"]
        assert len([e for e in entities if e.kind == "SEQEND"]) == 2


def test_turn_points_on_junctions_and_curve_points_inside_edges() -> None:
    job = _job()
    by_block = blocks(render_dxf(job))
    for piece, name in zip(job.pieces, block_names(job.pieces), strict=True):
        edges = piece.outline.seam_edges
        assert _count(by_block[name], "POINT", "2") == len(edges)
        assert _count(by_block[name], "POINT", "3") == sum(len(e.points) - 2 for e in edges)


def test_numbers_have_two_fixed_decimals() -> None:
    assert num(1.0) == "1.00"
    assert num(-0.001) == "0.00"
    assert num(12.3456) == "12.35"


def test_control_characters_cannot_inject_entities() -> None:
    normal = replace(_pieces()[0], name="A")
    hostile = replace(normal, name="A\n0\nLINE")
    plain = render_dxf(ExportJob("t", (normal,)))
    attack = render_dxf(ExportJob("t", (hostile,)))
    for kind in ("LINE", "TEXT"):
        assert read_pairs(attack).count((0, kind)) == read_pairs(plain).count((0, kind))
    assert "Piece Name: A0LINE" in attack.decode("cp1252")


def test_text_is_stripped_of_controls_and_encoded_in_cp1252() -> None:
    assert dxf_text("a\x00b\x1fc\x7fd\r\ne") == "abcde"
    piece = replace(_pieces()[0], name="Jupe été 中")
    content = render_dxf(ExportJob("t", (piece,)))
    assert "Piece Name: Jupe été ?".encode("cp1252") in content


def test_block_names_are_cleaned_and_unique() -> None:
    pieces = compute_cut_pieces(
        a_pattern(rectangle(100, 50, "a b"), rectangle(100, 50, "A_B"), rectangle(100, 50, "a_b"))
    )
    assert block_names(pieces) == ["A_B", "A_B_2", "A_B_3"]


def test_line_endings_are_crlf_everywhere() -> None:
    content = render_dxf(_job())
    assert content.count(b"\r\n") == content.count(b"\n")


def test_output_is_deterministic() -> None:
    assert render_dxf(_job("38")) == render_dxf(_job("38"))

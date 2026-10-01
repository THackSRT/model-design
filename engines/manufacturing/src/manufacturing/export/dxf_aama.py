"""Export DXF-AAMA (ASTM D6673) : DXF R12 ASCII, mm, une taille par fichier, un bloc par pièce.

Calques AAMA : 1 contour de coupe et textes, 2 points d'angle, 3 points de courbe, 4 crans,
6 pliure, 7 droit fil, 14 ligne de couture. Les blocs sont insérés à leur place sur la planche.
"""

import re

from manufacturing.core.model import CutPiece, Point
from manufacturing.export.dxf_writer import DxfWriter
from manufacturing.export.sheet import GAP_MM, ExportJob, Sheet, layout

LAYER_CUT = 1
LAYER_TURN = 2
LAYER_CURVE = 3
LAYER_NOTCH = 4
LAYER_FOLD = 6
LAYER_GRAIN = 7
LAYER_SEAM = 14
LAYERS = (0, LAYER_CUT, LAYER_TURN, LAYER_CURVE, LAYER_NOTCH, LAYER_FOLD, LAYER_GRAIN, LAYER_SEAM)
LAYER_COLOR = 7  # numéro de couleur AutoCAD (blanc / noir)
TEXT_HEIGHT_MM = 4.0
LINE_HEIGHT_MM = 6.0
HEADER_TEXT_HEIGHT_MM = 3.0
HEADER_LINE_MM = 5.0

_BLOCK_CHARS = re.compile(r"[^A-Z0-9_-]")


def block_names(pieces: tuple[CutPiece, ...]) -> list[str]:
    """Nom de bloc par pièce : `panelId` en majuscules, `[A-Z0-9_-]`, doublons suffixés."""
    used: set[str] = set()
    names: list[str] = []
    for piece in pieces:
        base = _BLOCK_CHARS.sub("_", piece.outline.panel_id.upper()) or "_"
        name, n = base, 1
        while name in used:
            n += 1
            name = f"{base}_{n}"
        used.add(name)
        names.append(name)
    return names


def _header(w: DxfWriter, sheet: Sheet) -> None:
    w.begin("HEADER")
    w.variable("$ACADVER", 1, "AC1009")
    w.variable("$MEASUREMENT", 70, 1)
    w.variable("$DWGCODEPAGE", 3, "ANSI_1252")
    w.pair(9, "$EXTMIN")
    w.point((0.0, 0.0))
    w.pair(9, "$EXTMAX")
    w.point((sheet.width_mm, sheet.height_mm))
    w.end()


def _tables(w: DxfWriter) -> None:
    w.begin("TABLES")
    w.pair(0, "TABLE")
    w.pair(2, "LTYPE")
    w.pair(70, 1)
    w.pair(0, "LTYPE")
    w.pair(2, "CONTINUOUS")
    w.pair(70, 0)
    w.pair(3, "Solid line")
    w.pair(72, 65)
    w.pair(73, 0)
    w.pair(40, 0.0)
    w.pair(0, "ENDTAB")
    w.pair(0, "TABLE")
    w.pair(2, "LAYER")
    w.pair(70, len(LAYERS))
    for layer in LAYERS:
        w.pair(0, "LAYER")
        w.pair(2, str(layer))
        w.pair(70, 0)
        w.pair(62, LAYER_COLOR)
        w.pair(6, "CONTINUOUS")
    w.pair(0, "ENDTAB")
    w.end()


def _polyline(w: DxfWriter, layer: int, points: tuple[Point, ...]) -> None:
    w.pair(0, "POLYLINE")
    w.pair(8, str(layer))
    w.pair(66, 1)
    w.point((0.0, 0.0))
    w.pair(70, 1)  # fermée
    for p in points:
        w.pair(0, "VERTEX")
        w.pair(8, str(layer))
        w.point(p)
    w.pair(0, "SEQEND")
    w.pair(8, str(layer))


def _point(w: DxfWriter, layer: int, p: Point) -> None:
    w.pair(0, "POINT")
    w.pair(8, str(layer))
    w.point(p)


def _line(w: DxfWriter, layer: int, a: Point, b: Point) -> None:
    w.pair(0, "LINE")
    w.pair(8, str(layer))
    w.point(a)
    w.point(b, 11)


def _text(w: DxfWriter, p: Point, height: float, content: str) -> None:
    w.pair(0, "TEXT")
    w.pair(8, str(LAYER_CUT))
    w.point(p)
    w.pair(40, height)
    w.pair(1, content)


def _turn_and_curve_points(w: DxfWriter, piece: CutPiece) -> None:
    for edge in piece.outline.seam_edges:
        _point(w, LAYER_TURN, edge.points[0])
        for p in edge.points[1:-1]:
            _point(w, LAYER_CURVE, p)


def _piece_texts(w: DxfWriter, piece: CutPiece, job: ExportJob) -> None:
    lines = [f"Piece Name: {piece.name}", f"Quantity: {piece.quantity}"]
    if job.size_label:
        lines.append(f"Size: {job.size_label}")
    x, y = piece.label_anchor
    for i, content in enumerate(lines):
        _text(w, (x, y - i * LINE_HEIGHT_MM), TEXT_HEIGHT_MM, content)


def _block(w: DxfWriter, name: str, piece: CutPiece, job: ExportJob) -> None:
    w.pair(0, "BLOCK")
    w.pair(8, "0")
    w.pair(2, name)
    w.pair(70, 0)
    w.point((0.0, 0.0))
    w.pair(3, name)
    _polyline(w, LAYER_CUT, piece.outline.cut_line)
    _turn_and_curve_points(w, piece)
    _polyline(w, LAYER_SEAM, piece.outline.seam_line)
    for mark in piece.notches:
        for a, b in mark.segments:
            _line(w, LAYER_NOTCH, a, b)
    _line(w, LAYER_GRAIN, *piece.grainline)
    if piece.fold_line is not None:
        _line(w, LAYER_FOLD, *piece.fold_line)
    _piece_texts(w, piece, job)
    w.pair(0, "ENDBLK")
    w.pair(8, "0")


def _entities(w: DxfWriter, job: ExportJob, sheet: Sheet, names: list[str]) -> None:
    w.begin("ENTITIES")
    style = job.reference or job.garment_type
    heads = [f"Style Name: {style}"]
    if job.size_label:
        heads.append(f"Sample Size: {job.size_label}")
    heads.append("Units: METRIC")
    for i, content in enumerate(heads):
        y = GAP_MM - HEADER_LINE_MM * (i + 1) + HEADER_LINE_MM / 2
        _text(w, (GAP_MM, y), HEADER_TEXT_HEIGHT_MM, content)
    for name, offset in zip(names, sheet.offsets, strict=True):
        w.pair(0, "INSERT")
        w.pair(8, str(LAYER_CUT))
        w.pair(2, name)
        w.point(offset)
    w.end()


def render_dxf(job: ExportJob) -> bytes:
    sheet = layout(job.pieces)
    names = block_names(job.pieces)
    w = DxfWriter()
    _header(w, sheet)
    _tables(w)
    w.begin("BLOCKS")
    for name, piece in zip(names, job.pieces, strict=True):
        _block(w, name, piece, job)
    w.end()
    _entities(w, job, sheet, names)
    return w.to_bytes()

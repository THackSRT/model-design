"""Planche SVG à l'échelle 1:1 : une unité = 1 mm, y inversé par calcul (jamais par `transform`)."""

import math
import re
from xml.sax.saxutils import escape

from manufacturing.core.model import CutPiece, NotchMark, Point
from manufacturing.export.labels import Labels, labels_for
from manufacturing.export.sheet import ExportJob, Sheet, layout

CUT_STROKE_MM = 0.5
SEAM_STROKE_MM = 0.3
NOTCH_STROKE_MM = 0.5
GRAIN_STROKE_MM = 0.3
FOLD_STROKE_MM = 0.3
SEAM_DASH_MM = "4,2"
ARROW_LENGTH_MM = 8.0
ARROW_ANGLE_RAD = math.radians(25)
NAME_FONT_MM = 6.0
TEXT_FONT_MM = 4.5
LINE_HEIGHT_MM = 6.0
FOLD_TEXT_OFFSET_MM = 3.0

_INVALID_XML = re.compile(r"[^\u0009\u000a\u000d\u0020-\uD7FF\uE000-\uFFFD\U00010000-\U0010FFFF]")
_ENTITIES = {'"': "&quot;", "'": "&apos;"}


def text_safe(value: str) -> str:
    """Échappe un texte issu de la requête (contenu d'élément ou valeur d'attribut)."""
    return escape(_INVALID_XML.sub("", value), _ENTITIES)


def num(value: float) -> str:
    text = f"{value:.2f}"
    return "0.00" if text == "-0.00" else text


class _Frame:
    """Passage du repère de la pièce (y vers le haut) à celui du SVG (y vers le bas)."""

    def __init__(self, sheet: Sheet, offset: Point) -> None:
        self.height = sheet.height_mm
        self.offset = offset

    def __call__(self, p: Point) -> Point:
        return (p[0] + self.offset[0], self.height - (p[1] + self.offset[1]))

    def pair(self, p: Point) -> str:
        x, y = self(p)
        return f"{num(x)},{num(y)}"


def _line(a: Point, b: Point, frame: _Frame, stroke: float) -> str:
    (x1, y1), (x2, y2) = frame(a), frame(b)
    return (
        f'<line x1="{num(x1)}" y1="{num(y1)}" x2="{num(x2)}" y2="{num(y2)}" '
        f'stroke="#000" stroke-width="{num(stroke)}"/>'
    )


def _polygon(points: tuple[Point, ...], frame: _Frame, extra: str) -> str:
    coords = " ".join(frame.pair(p) for p in points)
    return f'<polygon points="{coords}" fill="none" stroke="#000" {extra}/>'


def _text(p: Point, content: str, size: float, anchor: str = "middle") -> str:
    x, y = p
    return (
        f'<text x="{num(x)}" y="{num(y)}" font-family="sans-serif" '
        f'font-size="{num(size)}" text-anchor="{anchor}">{text_safe(content)}</text>'
    )


def _arrow(tip: Point, tail: Point, frame: _Frame) -> list[str]:
    angle = math.atan2(tail[1] - tip[1], tail[0] - tip[0])
    barbs = [
        (
            tip[0] + ARROW_LENGTH_MM * math.cos(angle + sign * ARROW_ANGLE_RAD),
            tip[1] + ARROW_LENGTH_MM * math.sin(angle + sign * ARROW_ANGLE_RAD),
        )
        for sign in (1, -1)
    ]
    return [_line(tip, barb, frame, GRAIN_STROKE_MM) for barb in barbs]


def _grainline(piece: CutPiece, frame: _Frame, labels: Labels) -> list[str]:
    start, end = piece.grainline
    out = [f'<g data-role="grainline"><title>{text_safe(labels.grainline)}</title>']
    out.append(_line(start, end, frame, GRAIN_STROKE_MM))
    if math.dist(start, end) > 2 * ARROW_LENGTH_MM:
        out += _arrow(start, end, frame) + _arrow(end, start, frame)
    out.append("</g>")
    return out


def _fold(piece: CutPiece, frame: _Frame, labels: Labels) -> list[str]:
    if piece.fold_line is None:
        return []
    start, end = piece.fold_line
    mid = ((start[0] + end[0]) / 2, (start[1] + end[1]) / 2)
    on_left = mid[0] < (piece.bounds[0][0] + piece.bounds[1][0]) / 2
    sx, sy = frame(mid)
    shift = FOLD_TEXT_OFFSET_MM if on_left else -FOLD_TEXT_OFFSET_MM
    return [
        '<g data-role="fold">',
        _line(start, end, frame, FOLD_STROKE_MM),
        _text((sx + shift, sy), labels.fold, TEXT_FONT_MM, "start" if on_left else "end"),
        "</g>",
    ]


def _notches(marks: tuple[NotchMark, ...], frame: _Frame) -> list[str]:
    segments = [seg for mark in marks for seg in mark.segments]
    if not segments:
        return []
    lines = [_line(a, b, frame, NOTCH_STROKE_MM) for a, b in segments]
    return ['<g data-role="notches">', *lines, "</g>"]


def _annotations(piece: CutPiece, job: ExportJob, frame: _Frame, labels: Labels) -> list[str]:
    cut = labels.cut_line(piece.quantity, piece.cut_on_fold)
    lines = [(piece.name, NAME_FONT_MM), (cut, TEXT_FONT_MM)]
    if job.size_label:
        lines.append((job.size_label, TEXT_FONT_MM))
    if job.reference:
        lines.append((job.reference, TEXT_FONT_MM))
    x, y = frame(piece.label_anchor)
    return [_text((x, y + i * LINE_HEIGHT_MM), text, size) for i, (text, size) in enumerate(lines)]


def _piece_group(piece: CutPiece, job: ExportJob, sheet: Sheet, index: int) -> list[str]:
    frame = _Frame(sheet, sheet.offsets[index])
    labels = labels_for(job.locale)
    group = [f'<g data-panel-id="{text_safe(piece.outline.panel_id)}">']
    group.append(_polygon(piece.outline.cut_line, frame, f'stroke-width="{num(CUT_STROKE_MM)}"'))
    seam = f'stroke-width="{num(SEAM_STROKE_MM)}" stroke-dasharray="{SEAM_DASH_MM}"'
    group.append(_polygon(piece.outline.seam_line, frame, seam))
    group += _notches(piece.notches, frame)
    group += _grainline(piece, frame, labels)
    group += _fold(piece, frame, labels)
    group += _annotations(piece, job, frame, labels)
    group.append("</g>")
    return group


def render_svg(job: ExportJob) -> bytes:
    sheet = layout(job.pieces)
    w, h = num(sheet.width_mm), num(sheet.height_mm)
    parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}mm" height="{h}mm" '
        f'viewBox="0 0 {w} {h}">',
        f"<title>{text_safe(job.garment_type)}</title>",
    ]
    for index, piece in enumerate(job.pieces):
        parts += _piece_group(piece, job, sheet, index)
    parts.append("</svg>")
    return ("\n".join(parts) + "\n").encode("utf-8")

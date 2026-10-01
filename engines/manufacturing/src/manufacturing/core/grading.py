"""Gradation par recalcul : pièces de chaque taille alignées, écarts de chaque sommet à la base."""

from collections.abc import Sequence
from dataclasses import dataclass, replace
from enum import StrEnum

from manufacturing.core.errors import SIZES_MISMATCH, ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.geometry import round_point
from manufacturing.core.model import (
    CutOutline,
    CutPiece,
    FinishingSettings,
    NotchMark,
    Pattern,
    Point,
    SeamEdge,
)

PRECISION_MM = 2


class Alignment(StrEnum):
    ORIGIN = "origin"
    GRAINLINE = "grainline"


@dataclass(frozen=True)
class SizedPattern:
    """Patron calculé pour une taille."""

    size: str
    pattern: Pattern


@dataclass(frozen=True)
class SizedPieces:
    size: str
    pieces: tuple[CutPiece, ...]


@dataclass(frozen=True)
class VertexGrade:
    """Écarts (dx, dy) du début du bord `edge_id`, dans l'ordre des tailles."""

    edge_id: str
    deltas: tuple[Point, ...]


@dataclass(frozen=True)
class PanelGrade:
    panel_id: str
    vertices: tuple[VertexGrade, ...]


@dataclass(frozen=True)
class GradedResult:
    sizes: tuple[SizedPieces, ...]
    rules: tuple[PanelGrade, ...]


def _mismatch(detail: str) -> ManufacturingError:
    return ManufacturingError(SIZES_MISMATCH, detail)


def check_sizes(sizes: Sequence[SizedPattern], base_size: str) -> SizedPattern:
    """Valide les noms et la structure commune ; rend la taille de base."""
    names = [s.size for s in sizes]
    for i, name in enumerate(names):
        if name in names[:i]:
            raise _mismatch(f"taille {name} en double")
    if base_size not in names:
        raise _mismatch(f"taille de base {base_size} absente des tailles")
    base = sizes[names.index(base_size)]
    for other in sizes:
        _check_structure(base, other)
    return base


def _check_structure(base: SizedPattern, other: SizedPattern) -> None:
    base_ids = [p.id for p in base.pattern.panels]
    other_ids = [p.id for p in other.pattern.panels]
    if base_ids != other_ids:
        diff = _first_difference(base_ids, other_ids)
        raise _mismatch(f"taille {other.size} : pièces différentes de {base.size} ({diff})")
    for a, b in zip(base.pattern.panels, other.pattern.panels, strict=True):
        a_edges, b_edges = [e.id for e in a.edges], [e.id for e in b.edges]
        if a_edges != b_edges:
            diff = _first_difference(a_edges, b_edges)
            raise _mismatch(f"taille {other.size}, pièce {a.id} : bords différents ({diff})")


def _first_difference(expected: list[str], given: list[str]) -> str:
    for i in range(max(len(expected), len(given))):
        want = expected[i] if i < len(expected) else "aucun"
        have = given[i] if i < len(given) else "aucun"
        if want != have:
            return f"rang {i} : {want} attendu, {have} trouvé"
    return "aucun écart"


def _shift(p: Point, offset: Point) -> Point:
    return round_point((p[0] + offset[0], p[1] + offset[1]))


def _shift_notch(mark: NotchMark, offset: Point) -> NotchMark:
    segments = tuple((_shift(a, offset), _shift(b, offset)) for a, b in mark.segments)
    return replace(mark, position=_shift(mark.position, offset), segments=segments)


def translate_piece(piece: CutPiece, offset: Point) -> CutPiece:
    """Translate toute la géométrie de la pièce."""
    outline = piece.outline
    seam_edges = tuple(
        SeamEdge(e.edge_id, e.role, tuple(_shift(p, offset) for p in e.points), e.allowance_mm)
        for e in outline.seam_edges
    )
    cut_line = tuple(_shift(p, offset) for p in outline.cut_line)
    fold = piece.fold_line
    return replace(
        piece,
        outline=CutOutline(outline.panel_id, seam_edges, cut_line),
        notches=tuple(_shift_notch(n, offset) for n in piece.notches),
        grainline=(_shift(piece.grainline[0], offset), _shift(piece.grainline[1], offset)),
        fold_line=(_shift(fold[0], offset), _shift(fold[1], offset)) if fold else None,
        label_anchor=_shift(piece.label_anchor, offset),
        bounds=(_shift(piece.bounds[0], offset), _shift(piece.bounds[1], offset)),
    )


def _align(
    pieces: tuple[CutPiece, ...], base: tuple[CutPiece, ...], alignment: Alignment
) -> tuple[CutPiece, ...]:
    if alignment is Alignment.ORIGIN:
        return pieces
    result = []
    for piece, ref in zip(pieces, base, strict=True):
        (gx, gy), (rx, ry) = piece.grainline[0], ref.grainline[0]
        result.append(translate_piece(piece, (rx - gx, ry - gy)))
    return tuple(result)


def _vertex(piece: CutPiece, index: int) -> Point:
    return piece.outline.seam_edges[index].points[0]


def _delta(piece: CutPiece, ref: CutPiece, index: int) -> Point:
    (x, y), (bx, by) = _vertex(piece, index), _vertex(ref, index)
    return (round(x - bx, PRECISION_MM) + 0.0, round(y - by, PRECISION_MM) + 0.0)


def _rules(base: SizedPieces, sizes: tuple[SizedPieces, ...]) -> tuple[PanelGrade, ...]:
    rules = []
    for p, ref in enumerate(base.pieces):
        vertices = tuple(
            VertexGrade(edge.edge_id, tuple(_delta(s.pieces[p], ref, e) for s in sizes))
            for e, edge in enumerate(ref.outline.seam_edges)
        )
        rules.append(PanelGrade(ref.outline.panel_id, vertices))
    return tuple(rules)


def grade_patterns(
    sizes: Sequence[SizedPattern],
    base_size: str,
    alignment: Alignment,
    settings: FinishingSettings,
) -> GradedResult:
    """Finit chaque taille avec les mêmes réglages, les aligne et calcule les écarts à la base."""
    base = check_sizes(sizes, base_size)
    finished = {
        s.size: compute_cut_pieces(
            s.pattern, settings.policy, settings.requests, settings.auto_notches
        )
        for s in sizes
    }
    aligned = tuple(
        SizedPieces(s.size, _align(finished[s.size], finished[base.size], alignment)) for s in sizes
    )
    base_pieces = next(s for s in aligned if s.size == base.size)
    return GradedResult(aligned, _rules(base_pieces, aligned))

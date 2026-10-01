"""Plan de coupe : pièces à placer, rotations, pliure, métrage et efficience (mm)."""

import math
from dataclasses import dataclass
from enum import StrEnum

from manufacturing.core.errors import ManufacturingError
from manufacturing.core.finishing import compute_cut_pieces
from manufacturing.core.geometry import round_point, signed_area
from manufacturing.core.model import CutPiece, FinishingSettings, Pattern, Point
from manufacturing.core.nesting import Box, nest
from manufacturing.core.unfold import unfold

FOLD_NOT_ON_GRAIN = "fold-not-on-grain"
PIECE_WIDER_THAN_FABRIC = "piece-wider-than-fabric"
TOO_MANY_PIECES = "too-many-pieces"

MAX_PLACEMENTS = 500
FOLD_TOLERANCE_DEG = 0.5


class Layout(StrEnum):
    SINGLE = "single"
    FOLDED = "folded"


class Direction(StrEnum):
    ONE_WAY = "one-way"
    TWO_WAY = "two-way"


@dataclass(frozen=True)
class Fabric:
    width_mm: float
    layout: Layout = Layout.FOLDED
    direction: Direction = Direction.TWO_WAY  # sans effet : pas de retournement à 180° (v1)
    selvedge_margin_mm: float = 10.0

    @property
    def usable_width_mm(self) -> float:
        if self.layout is Layout.FOLDED:
            return self.width_mm / 2 - self.selvedge_margin_mm
        return self.width_mm - 2 * self.selvedge_margin_mm


@dataclass(frozen=True)
class GarmentToCut:
    label: str
    pattern: Pattern
    count: int = 1


@dataclass(frozen=True)
class PlacedPiece:
    garment_label: str
    panel_id: str
    copy: int
    plies: int
    rotation_deg: float
    mirrored: bool
    on_fold: bool
    outline: tuple[Point, ...]


@dataclass(frozen=True)
class CuttingPlan:
    usable_width_mm: float
    fabric_length_mm: int
    efficiency: float
    piece_count: int
    surplus_piece_count: int
    placements: tuple[PlacedPiece, ...]


@dataclass(frozen=True)
class _Flags:
    plies: int
    mirrored: bool
    on_fold: bool


@dataclass(frozen=True)
class _Shape:
    """Forme prête à placer : contour dont le coin du rectangle englobant est en (0, 0)."""

    outline: tuple[Point, ...]
    length_mm: float
    width_mm: float
    area_mm2: float
    rotation_deg: float
    flags: _Flags


@dataclass(frozen=True)
class _Item:
    label: str
    panel_id: str
    copy: int
    shape: _Shape


def _rotate(points: list[Point], theta: float) -> list[Point]:
    c, s = math.cos(theta), math.sin(theta)
    return [(c * x - s * y, s * x + c * y) for x, y in points]


def _shape(points: list[Point], theta: float, flags: _Flags) -> _Shape:
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    x0, y0 = min(xs), min(ys)
    outline = tuple((x - x0, y - y0) for x, y in points)
    degrees = round(math.degrees(theta) % 360, 2)
    return _Shape(
        outline=outline,
        length_mm=max(xs) - x0,
        width_mm=max(ys) - y0,
        area_mm2=abs(signed_area(points)),
        rotation_deg=0.0 if degrees >= 360 else degrees,
        flags=flags,
    )


def _grain_angle(piece: CutPiece) -> float:
    (ax, ay), (bx, by) = piece.grainline
    return math.atan2(by - ay, bx - ax)


def _check_fold_on_grain(piece: CutPiece, grain: float) -> None:
    assert piece.fold_line is not None
    (ax, ay), (bx, by) = piece.fold_line
    gap = (math.atan2(by - ay, bx - ax) - grain) % math.pi
    if math.degrees(min(gap, math.pi - gap)) > FOLD_TOLERANCE_DEG:
        raise ManufacturingError(
            FOLD_NOT_ON_GRAIN, f"pièce {piece.outline.panel_id} : pliure hors du droit fil"
        )


def _folded_on_fold(piece: CutPiece, theta: float) -> _Shape:
    """Pliure posée sur y = 0, pièce du côté des y positifs."""
    assert piece.fold_line is not None
    points = _rotate(list(piece.outline.cut_line), theta)
    fold = _rotate(list(piece.fold_line), theta)
    fold_y = (fold[0][1] + fold[1][1]) / 2
    farthest = max((p[1] - fold_y for p in points), key=abs)
    if farthest < 0:
        points = [(x, 2 * fold_y - y) for x, y in points]
    return _shape(points, theta, _Flags(1, False, True))


def _shapes(piece: CutPiece, fabric: Fabric) -> tuple[_Shape, _Shape | None]:
    """Forme de la pièce et, à plat, sa forme symétrique (une copie sur deux)."""
    theta = -_grain_angle(piece)
    folded = fabric.layout is Layout.FOLDED
    if piece.cut_on_fold and folded:
        _check_fold_on_grain(piece, -theta)
        return _folded_on_fold(piece, theta), None
    if piece.cut_on_fold:
        points = _rotate(unfold(piece), theta)
        return _shape(points, theta, _Flags(1, False, False)), None
    points = _rotate(list(piece.outline.cut_line), theta)
    plain = _shape(points, theta, _Flags(2 if folded else 1, False, False))
    if folded:
        return plain, None
    return plain, _shape([(x, -y) for x, y in points], theta, _Flags(1, True, False))


def _placement_count(piece: CutPiece, layout: Layout) -> int:
    if layout is Layout.SINGLE or piece.cut_on_fold:
        return piece.quantity
    return math.ceil(piece.quantity / 2)


def _surplus(piece: CutPiece, layout: Layout) -> int:
    if layout is Layout.SINGLE or piece.cut_on_fold:
        return 0
    return 2 * math.ceil(piece.quantity / 2) - piece.quantity


def _check_count(
    garments: tuple[GarmentToCut, ...], finished: list[tuple[CutPiece, ...]], fabric: Fabric
) -> None:
    total = sum(
        g.count * sum(_placement_count(p, fabric.layout) for p in pieces)
        for g, pieces in zip(garments, finished, strict=True)
    )
    if total > MAX_PLACEMENTS:
        raise ManufacturingError(
            TOO_MANY_PIECES, f"{total} placements demandés, au plus {MAX_PLACEMENTS}"
        )


def _check_width(piece: CutPiece, shape: _Shape, usable_mm: float) -> None:
    if round(shape.width_mm, 2) > round(usable_mm, 2):
        raise ManufacturingError(
            PIECE_WIDER_THAN_FABRIC, f"pièce {piece.outline.panel_id} plus large que le tissu"
        )


def _expand(
    garments: tuple[GarmentToCut, ...], finished: list[tuple[CutPiece, ...]], fabric: Fabric
) -> tuple[list[_Item], int]:
    items: list[_Item] = []
    counters: dict[tuple[str, str], int] = {}
    surplus = 0
    for garment, pieces in zip(garments, finished, strict=True):
        shapes = [_shapes(p, fabric) for p in pieces]
        for piece, (plain, _) in zip(pieces, shapes, strict=True):
            _check_width(piece, plain, fabric.usable_width_mm)
        for _ in range(garment.count):
            for piece, (plain, mirror) in zip(pieces, shapes, strict=True):
                key_base = (garment.label, piece.outline.panel_id)
                for j in range(1, _placement_count(piece, fabric.layout) + 1):
                    counters[key_base] = counters.get(key_base, 0) + 1
                    shape = mirror if mirror is not None and j % 2 == 0 else plain
                    items.append(_Item(*key_base, counters[key_base], shape))
                surplus += _surplus(piece, fabric.layout)
    return items, surplus


def _sort_key(item: _Item) -> tuple[float, float, str, str, int]:
    shape = item.shape
    return (-shape.length_mm, -shape.width_mm, item.label, item.panel_id, item.copy)


def _place(item: _Item, at: Point) -> PlacedPiece:
    shape = item.shape
    return PlacedPiece(
        garment_label=item.label,
        panel_id=item.panel_id,
        copy=item.copy,
        plies=shape.flags.plies,
        rotation_deg=shape.rotation_deg,
        mirrored=shape.flags.mirrored,
        on_fold=shape.flags.on_fold,
        outline=tuple(round_point((x + at[0], y + at[1])) for x, y in shape.outline),
    )


def compute_cutting_plan(
    garments: tuple[GarmentToCut, ...],
    fabric: Fabric,
    settings: FinishingSettings,
    spacing_mm: float,
) -> CuttingPlan:
    """Finit les vêtements, place les pièces sur la laize, rend métrage et efficience."""
    finished = [
        compute_cut_pieces(g.pattern, settings.policy, settings.requests, settings.auto_notches)
        for g in garments
    ]
    _check_count(garments, finished, fabric)
    items, surplus = _expand(garments, finished, fabric)
    items.sort(key=_sort_key)
    usable = fabric.usable_width_mm
    boxes = [Box(i.shape.length_mm, i.shape.width_mm, i.shape.flags.on_fold) for i in items]
    placements = tuple(
        _place(i, at) for i, at in zip(items, nest(boxes, usable, spacing_mm), strict=True)
    )
    length = math.ceil(max((x for p in placements for x, _ in p.outline), default=0.0))
    area = sum(i.shape.area_mm2 for i in items)
    efficiency = min(1.0, round(area / (usable * length), 4)) if length else 0.0
    return CuttingPlan(
        usable_width_mm=usable,
        fabric_length_mm=length,
        efficiency=efficiency,
        piece_count=sum(p.plies for p in placements),
        surplus_piece_count=surplus,
        placements=placements,
    )

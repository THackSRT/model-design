"""Finition des pièces : droit fil, pliure, étiquette, encombrement, aire et crans."""

from manufacturing.core.allowances import cut_outline, validate_policy
from manufacturing.core.darts import dart_pairs
from manufacturing.core.errors import FOLD_EDGE_MISSING, UNKNOWN_EDGE, ManufacturingError
from manufacturing.core.geometry import point_in_polygon, round_point, signed_area
from manufacturing.core.model import (
    DEFAULT_POLICY,
    AllowancePolicy,
    CutOutline,
    CutPiece,
    EdgeRole,
    FinishingSettings,
    NotchRequest,
    Panel,
    Pattern,
    Point,
)
from manufacturing.core.notches import place_notches

GRAIN_START_RATIO = 0.2
GRAIN_END_RATIO = 0.8


def _bounds(points: tuple[Point, ...]) -> tuple[Point, Point]:
    xs, ys = [p[0] for p in points], [p[1] for p in points]
    return (min(xs), min(ys)), (max(xs), max(ys))


def default_grainline(seam_line: tuple[Point, ...]) -> tuple[Point, Point]:
    """Verticale au centre du rectangle englobant de la couture, de 20 % à 80 % de sa hauteur."""
    (x0, y0), (x1, y1) = _bounds(seam_line)
    x, height = (x0 + x1) / 2, y1 - y0
    return (x, y0 + GRAIN_START_RATIO * height), (x, y0 + GRAIN_END_RATIO * height)


def centroid(polygon: tuple[Point, ...]) -> Point | None:
    """Centre de gravité d'un polygone ; `None` s'il est plat."""
    area = signed_area(polygon)
    if abs(area) < 1e-9:
        return None
    cx = cy = 0.0
    for (x1, y1), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1], strict=True):
        cross = x1 * y2 - x2 * y1
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    return (cx / (6 * area), cy / (6 * area))


def label_anchor(seam_line: tuple[Point, ...], grainline: tuple[Point, Point]) -> Point:
    """Centroïde de la couture s'il est intérieur, sinon milieu du droit fil."""
    center = centroid(seam_line)
    if center is not None and point_in_polygon(center, seam_line):
        return center
    (ax, ay), (bx, by) = grainline
    return ((ax + bx) / 2, (ay + by) / 2)


def fold_line(panel: Panel, outline: CutOutline) -> tuple[Point, Point] | None:
    """Extrémités du bord de rôle fold si la pièce se coupe sur la pliure."""
    if not panel.cut_on_fold:
        return None
    for edge in outline.seam_edges:
        if edge.role is EdgeRole.FOLD:
            return edge.points[0], edge.points[-1]
    raise ManufacturingError(FOLD_EDGE_MISSING, f"pièce {panel.id} : aucun bord de rôle fold")


def finish_piece(pattern: Pattern, panel: Panel, settings: FinishingSettings) -> CutPiece:
    outline = cut_outline(panel, settings.policy, dart_pairs(pattern, panel))
    seam = outline.seam_line
    grain = panel.grainline or default_grainline(seam)
    grain = (round_point(grain[0]), round_point(grain[1]))
    low, high = _bounds(outline.cut_line)
    return CutPiece(
        outline=outline,
        name=panel.name,
        quantity=panel.quantity,
        cut_on_fold=panel.cut_on_fold,
        notches=place_notches(pattern, panel, outline, settings),
        grainline=grain,
        fold_line=fold_line(panel, outline),
        label_anchor=round_point(label_anchor(seam, grain)),
        bounds=(round_point(low), round_point(high)),
        cut_area_mm2=round(abs(signed_area(outline.cut_line)), 2) + 0.0,
    )


def compute_cut_pieces(
    pattern: Pattern,
    policy: AllowancePolicy = DEFAULT_POLICY,
    requests: tuple[NotchRequest, ...] = (),
    auto_notches: bool = True,
) -> tuple[CutPiece, ...]:
    """Pièces de coupe de tout le patron (valeurs de couture, crans, droit fil, pliure)."""
    validate_policy(pattern, policy)
    known = {p.id for p in pattern.panels}
    for request in requests:
        if request.panel_id not in known:
            raise ManufacturingError(UNKNOWN_EDGE, f"pièce {request.panel_id} inconnue")
    settings = FinishingSettings(policy, requests, auto_notches)
    return tuple(finish_piece(pattern, p, settings) for p in pattern.panels)

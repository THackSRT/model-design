"""Cohérence des coutures avec le placement : la convention de l'ADR 0013, vérifiée par vêtement.

On déplie les pièces au pli, on retourne les copies (`quantity: 2`), on apparie les exemplaires de
chaque couture (côté avec côté) et l'on vérifie : même côté du porteur, sens opposés, débuts
appariés à la même hauteur relative (hors embu, hors ouverture de la pince de poitrine).
"""

from dataclasses import dataclass

import pytest

from patterning.core.drafting import draft
from patterning.core.model import BodySide, Edge, Facing, Panel, Pattern, Placement, Point, Seam
from tests.builders import REFERENCE_PARAMS, reference_measurements

HEIGHT_TOLERANCE_MM = 5.0
OPPOSITE = {"left": "right", "right": "left", "median": "median"}
# bords du devant du corsage au-dessus de la pince de poitrine : décalés de son ouverture
ABOVE_BUST_DART = {"bust-dart-lower", "bust-dart-upper", "side-upper", "armhole", "shoulder"}


@dataclass(frozen=True)
class Copy:
    """Un exemplaire d'un bord, dans le repère du porteur : u vers sa gauche, h vers le haut."""

    panel: Panel
    side: str
    start: Point
    end: Point

    @property
    def chord(self) -> Point:
        return (self.end[0] - self.start[0], self.end[1] - self.start[1])


def _placement(panel: Panel) -> Placement:
    assert panel.placement is not None
    return panel.placement


def _drawn_side(panel: Panel, edge: Edge) -> str:
    """Côté du porteur de l'exemplaire tel que dessiné."""
    placement = _placement(panel)
    if placement.body_side is not BodySide.CENTER:
        return placement.body_side.value
    offset = (edge.start[0] + edge.end[0]) / 2 - placement.anchor[0]
    if abs(offset) < 1e-6:
        return "median"
    # de face, la gauche du porteur est à droite du dessin ; de dos, c'est l'inverse
    left = offset > 0 if placement.facing is not Facing.BACK else offset < 0
    return "left" if left else "right"


def _copies(panel: Panel, edge_id: str) -> list[Copy]:
    placement = _placement(panel)
    edge = panel.edge(edge_id)
    ax, ay = placement.anchor
    sign = -1.0 if placement.facing is Facing.BACK else 1.0
    drawn = _drawn_side(panel, edge)
    start, end = ((sign * (p[0] - ax), p[1] - ay) for p in (edge.start, edge.end))
    copies = [Copy(panel, drawn, start, end)]
    if (
        panel.cut_on_fold or panel.quantity == 2
    ):  # dépliage ou copie retournée : miroir et sens inversé
        copies.append(Copy(panel, OPPOSITE[drawn], (-end[0], end[1]), (-start[0], start[1])))
    return copies


def _dart_opening(pattern: Pattern) -> float:
    for panel in pattern.panels:
        if any(e.id == "bust-dart-lower" for e in panel.edges):
            return panel.edge("bust-dart-upper").end[1] - panel.edge("bust-dart-lower").start[1]
    return 0.0


def _pairs(seam: Seam, pattern: Pattern) -> list[tuple[Copy, Copy]]:
    a_panel, b_panel = pattern.panel(seam.a[0]), pattern.panel(seam.b[0])
    a_copies, b_copies = _copies(a_panel, seam.a[1]), _copies(b_panel, seam.b[1])
    if seam.id.startswith("center"):  # milieu : pièce gauche contre pièce droite
        assert {_placement(a_panel).body_side, _placement(b_panel).body_side} == {
            BodySide.LEFT,
            BodySide.RIGHT,
        }, seam.id
        return [(a_copies[0], b_copies[0])]
    # deux bords des deux côtés : côté par côté ; un seul exemplaire : il prend la copie de son côté
    fewer, other = sorted((a_copies, b_copies), key=len)
    pairs = []
    for one in fewer:
        same_side = [c for c in other if c.side == one.side]
        assert len(same_side) == 1, f"{seam.id} : pas d'exemplaire {one.side} de l'autre bord"
        pairs.append((one, same_side[0]) if fewer is a_copies else (same_side[0], one))
    return pairs


def _check_pair(seam: Seam, pair: tuple[Copy, Copy], slack: float, heights: bool) -> None:
    a, b = pair
    same_zone = _placement(a.panel).zone is _placement(b.panel).zone
    if same_zone:
        # couture au milieu : l'autre pièce est le miroir de la première, on la ramène de ce côté
        mirror = -1.0 if a.side != b.side else 1.0
        dot = mirror * a.chord[0] * b.chord[0] + a.chord[1] * b.chord[1]
    else:  # repères différents (bras et torse) : seul le sens vertical se compare
        dot = a.chord[1] * b.chord[1]
    assert dot < 0, f"{seam.id} ({a.side}) : les deux bords vont dans le même sens"
    same_landmark = _placement(a.panel).landmark is _placement(b.panel).landmark
    if same_zone and same_landmark and heights:
        tolerance = HEIGHT_TOLERANCE_MM + slack
        assert abs(a.start[1] - b.end[1]) <= tolerance, f"{seam.id} ({a.side}) : débuts décalés"
        assert abs(a.end[1] - b.start[1]) <= tolerance, f"{seam.id} ({a.side}) : fins décalées"


CASES = list(REFERENCE_PARAMS)


@pytest.mark.parametrize("case", CASES)
def test_every_seam_follows_the_convention(case: str) -> None:
    name = "bodice" if case.startswith("bodice") else case
    pattern = draft(name, reference_measurements(case), REFERENCE_PARAMS[case])
    opening = _dart_opening(pattern)
    checked = 0
    for seam in pattern.seams:
        # ceinture plane contre taille de jupe cercle en arc : pas de hauteur comparable
        heights = "waistband" not in seam.id or seam.id.startswith("waistband-side")
        slack = opening if {seam.a[1], seam.b[1]} & ABOVE_BUST_DART else 0.0
        if seam.a[0] != "front" and seam.b[0] != "front":
            slack = 0.0
        for pair in _pairs(seam, pattern):
            _check_pair(seam, pair, slack, heights)
            checked += 1
    assert checked >= len(pattern.seams)


def test_a_seam_whose_edges_run_the_same_way_is_rejected() -> None:
    pattern = draft("straight-skirt", reference_measurements(), REFERENCE_PARAMS["straight-skirt"])
    bad = Seam("bad", ("front", "side-lower"), ("front", "side-lower"))
    with pytest.raises(AssertionError, match="même sens"):
        for pair in _pairs(bad, pattern):
            _check_pair(bad, pair, 0.0, True)


def test_a_seam_with_no_copy_on_the_same_side_is_rejected() -> None:
    pattern = draft("straight-skirt", reference_measurements(), REFERENCE_PARAMS["straight-skirt"])
    bad = Seam("bad", ("back-right", "side-lower"), ("back-left", "side-lower"))
    with pytest.raises(AssertionError, match="pas d'exemplaire"):
        _pairs(bad, pattern)

"""Pinces : détection (deux bords consécutifs cousus ensemble) et pont de la ligne de coupe."""

from collections.abc import Sequence

from manufacturing.core.errors import ADJACENT_DARTS, ManufacturingError
from manufacturing.core.model import Panel, Pattern, Point

type DartPair = tuple[int, int]  # indices (jambe d'entrée, jambe de sortie) dans Panel.edges


def dart_pairs(pattern: Pattern, panel: Panel) -> tuple[DartPair, ...]:
    """Pinces d'une pièce : couture dont les deux bords sont sur cette pièce et consécutifs."""
    ids = [e.id for e in panel.edges]
    count = len(ids)
    sewn = {
        frozenset((s.a[1], s.b[1]))
        for s in pattern.seams
        if s.a[0] == panel.id and s.b[0] == panel.id and s.a[1] != s.b[1]
    }
    pairs = tuple(
        (i, (i + 1) % count)
        for i in range(count)
        if frozenset((ids[i], ids[(i + 1) % count])) in sewn
    )
    _check_separated(panel, pairs)
    return pairs


def _check_separated(panel: Panel, pairs: Sequence[DartPair]) -> None:
    """Deux pinces doivent être séparées par au moins un bord qui n'est la jambe d'aucune pince."""
    count = len(panel.edges)
    for n, (first, second) in enumerate(pairs):
        others = {k for m, pair in enumerate(pairs) if m != n for k in pair}
        if {first, second, (first - 1) % count, (second + 1) % count} & others:
            raise ManufacturingError(
                ADJACENT_DARTS, f"pièce {panel.id} : deux pinces se touchent ou se chevauchent"
            )


def dart_edge_ids(panel: Panel, darts: Sequence[DartPair]) -> frozenset[str]:
    return frozenset(panel.edges[k].id for pair in darts for k in pair)


def bridge_contour(
    edges: Sequence[Sequence[Point]], allowances: Sequence[float], darts: Sequence[DartPair]
) -> tuple[list[Sequence[Point]], list[float]]:
    """Contour où chaque pince est remplacée par la corde qui la franchit (pince fermée).

    La corde reçoit la plus grande valeur des deux bords voisins : la ligne de coupe relie ainsi
    directement le décalage du bord qui précède la pince à celui du bord qui la suit.
    """
    count = len(edges)
    chords = {first: second for first, second in darts}
    skipped = set(chords.values())
    out_edges: list[Sequence[Point]] = []
    out_values: list[float] = []
    for i in range(count):
        if i in skipped:
            continue
        if i in chords:
            j = chords[i]
            out_edges.append([edges[i][0], edges[j][-1]])
            out_values.append(max(allowances[(i - 1) % count], allowances[(j + 1) % count]))
        else:
            out_edges.append(edges[i])
            out_values.append(allowances[i])
    return out_edges, out_values

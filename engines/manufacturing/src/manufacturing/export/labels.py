"""Catalogue des annotations des exports, par langue (aucune autre chaîne d'annotation)."""

from dataclasses import dataclass

from manufacturing.core.errors import ManufacturingError


@dataclass(frozen=True)
class Labels:
    fold: str  # texte posé le long de la pliure
    cut: str  # « Couper » : suivi de la quantité puis du signe de multiplication
    times: str
    on_fold: str  # ajouté quand la pièce se coupe sur pliure
    grainline: str  # description du droit fil (accessibilité)

    def cut_line(self, quantity: int, cut_on_fold: bool) -> str:
        text = f"{self.cut} {quantity} {self.times}"
        return f"{text} {self.on_fold}" if cut_on_fold else text


MULTIPLICATION_SIGN = chr(0xD7)


CATALOGS: dict[str, Labels] = {
    "fr": Labels(
        fold="PLIURE",
        cut="Couper",
        times=MULTIPLICATION_SIGN,
        on_fold="— sur pliure",
        grainline="droit fil",
    ),
}


def labels_for(locale: str) -> Labels:
    try:
        return CATALOGS[locale]
    except KeyError:
        raise ManufacturingError("unsupported-locale", f"langue inconnue : {locale}") from None

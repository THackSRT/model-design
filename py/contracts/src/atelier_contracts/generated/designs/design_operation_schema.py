# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel

from .. import garment_spec_schema


class OperationId(RootModel[str]):
    root: str = Field(
        ...,
        description="Identifiant de l'opération, unique dans le document : le rejeu du moteur de tracé le vérifie, un schéma JSON ne sait pas le dire. Stable : annuler, masquer, régler et les propositions de l'assistant désignent l'opération par lui. Lettres, chiffres, tirets et soulignés (un UUID convient).",
        pattern="^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$",
    )


class BasePiece(StrEnum):
    front = "front"
    back = "back"
    sleeve = "sleeve"


class PieceLandmark(StrEnum):
    centerNeck = "centerNeck"
    neckShoulder = "neckShoulder"
    shoulderPoint = "shoulderPoint"
    armholePitch = "armholePitch"
    armholeBottom = "armholeBottom"
    centerWaist = "centerWaist"
    sideWaist = "sideWaist"
    centerHip = "centerHip"
    sideHip = "sideHip"
    centerHem = "centerHem"
    sideHem = "sideHem"
    sleeveTop = "sleeveTop"
    bicepsFront = "bicepsFront"
    bicepsBack = "bicepsBack"
    wristFront = "wristFront"
    wristBack = "wristBack"


class PieceName(RootModel[str]):
    root: str = Field(
        ...,
        description="Nom d'une région ou d'une pièce ajoutée, écrit sur les patrons, le plan de coupe et la liste de coupe (ex. Plastron) : une ligne, jamais de donnée de client.",
        max_length=80,
        min_length=1,
        pattern="^[^\\x00-\\x1F\\x7F]+$",
    )


class LandmarkAnchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    landmark: PieceLandmark
    xFraction: float | None = Field(
        None,
        description="Fraction de l'abscisse du repère, sans unité, avant le décalage dxMm : 0 sur l'axe de la pièce, 1 à l'aplomb du repère. Absent : 1.",
        ge=-1.0,
        le=1.0,
    )
    dxMm: float | None = Field(
        None,
        description="Décalage horizontal, en mm, positif vers le côté (vers le devant sur une manche). Absent : 0.",
        ge=-3000.0,
        le=3000.0,
    )
    dyMm: float | None = Field(
        None,
        description="Décalage vertical, en mm, positif vers le bas. Absent : 0.",
        ge=-3000.0,
        le=3000.0,
    )


class PointAnchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    xMm: float = Field(..., description="Abscisse, en mm.", ge=-3000.0, le=3000.0)
    yMm: float = Field(
        ..., description="Ordonnée, en mm, positive vers le bas.", ge=-3000.0, le=3000.0
    )


class HemShapeOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["hemShape"] = Field(..., description="Déformation d'ourlet.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    flareMm: float | None = Field(
        0,
        description="Évasement, en mm : le coin d'ourlet s'écarte de cette longueur vers l'extérieur, le côté s'évase progressivement depuis sa mi-hauteur et l'ourlet suit.",
        ge=0.0,
        le=300.0,
    )
    curveMm: float | None = Field(
        0,
        description="Arrondi, en mm : l'ourlet remonte de cette hauteur au coin, en courbe depuis le milieu (carré de la distance au milieu) ; les points du côté sous le nouveau coin disparaissent.",
        ge=0.0,
        le=300.0,
    )


class Shape(StrEnum):
    round = "round"
    v = "v"


class NecklineOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["neckline"] = Field(..., description="Encolure.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    shape: Shape | None = Field(
        "round",
        description="Forme de l'encolure devant : round, ronde ; v, en V (le dos reste rond).",
    )
    lowerMm: float | None = Field(
        0,
        description="Creusement du milieu devant sous l'encolure de la base, en mm (forme round ; sans effet en v).",
        ge=0.0,
        le=250.0,
    )
    widenMm: float | None = Field(
        0,
        description="Élargissement, en mm : le point d'encolure recule de cette longueur le long de l'épaule, devant et dos.",
        ge=0.0,
        le=100.0,
    )
    vDepthMm: float | None = Field(
        160,
        description="Profondeur de la pointe du V sous le haut de la pièce (y = 0, niveau du point d'encolure de la base), en mm (forme v ; sans effet en round).",
        ge=80.0,
        le=450.0,
    )
    backLowerMm: float | None = Field(
        0,
        description="Creusement du milieu dos sous l'encolure de la base, en mm.",
        ge=0.0,
        le=150.0,
    )
    facingWidthMm: float | None = Field(
        55,
        description="Largeur des parementures d'encolure, mesurée depuis l'encolure, en mm.",
        ge=20.0,
        le=120.0,
    )


class SleeveLengthOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["sleeveLength"] = Field(..., description="Longueur de manche.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    lengthMm: float = Field(
        ...,
        description="Longueur totale de la manche, du sommet de la tête au bas de manche, en mm.",
        ge=100.0,
        le=1000.0,
    )


class Style(StrEnum):
    barrel = "barrel"
    french = "french"


class SideSlitOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["sideSlit"] = Field(..., description="Fentes de côté.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    heightMm: float | None = Field(
        100,
        description="Hauteur des fentes au-dessus de l'ourlet, en mm.",
        ge=20.0,
        le=500.0,
    )


class Edge(StrEnum):
    hem = "hem"
    sleeveHem = "sleeveHem"


class Preset(StrEnum):
    u = "u"
    pointed = "pointed"
    square = "square"


class StyleLinePreset(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    preset: Preset = Field(..., description="Forme : u, pointed ou square.")
    depthMm: float = Field(
        ...,
        description="Profondeur au milieu, sous le haut de la pièce (y = 0), en mm.",
        ge=30.0,
        le=1000.0,
    )
    shoulderXMm: float = Field(
        ...,
        description="Départ sur l'épaule : abscisse du point de l'épaule où commence la découpe, en mm (ramenée à la plage de l'épaule).",
        ge=0.0,
        le=500.0,
    )


class YokePreset(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    preset: Literal["yoke"] = Field(..., description="Empiècement.")
    depthMm: float = Field(
        ...,
        description="Profondeur de la découpe sous le haut de la pièce (y = 0), en mm.",
        ge=30.0,
        le=1000.0,
    )


class NeckSlitOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["neckSlit"] = Field(..., description="Fente d'encolure.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    lengthMm: float | None = Field(
        80,
        description="Longueur de la fente sous le milieu de l'encolure, en mm.",
        ge=20.0,
        le=300.0,
    )
    facingWidthMm: float | None = Field(
        70, description="Largeur de la parementure de fente, en mm.", ge=30.0, le=150.0
    )


class Side(StrEnum):
    left = "left"
    right = "right"


class Shape1(StrEnum):
    straight = "straight"
    pointed = "pointed"


class Side1(StrEnum):
    left = "left"
    right = "right"
    both = "both"


class Motif(StrEnum):
    leaves = "leaves"


class EdgeXAnchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edge: garment_spec_schema.EdgeSemanticRole = Field(
        ...,
        description="Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.",
    )
    xMm: float = Field(
        ...,
        description="Abscisse du point, en mm, dans le repère de la pièce.",
        ge=-3000.0,
        le=3000.0,
    )


class EdgeYAnchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edge: garment_spec_schema.EdgeSemanticRole = Field(
        ...,
        description="Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.",
    )
    yMm: float = Field(
        ...,
        description="Ordonnée du point, en mm, dans le repère de la pièce (positive vers le bas).",
        ge=-3000.0,
        le=3000.0,
    )


class EdgeFractionAnchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    edge: garment_spec_schema.EdgeSemanticRole = Field(
        ...,
        description="Rôle du bord (EdgeSemanticRole de GarmentSpec). Une manche a deux dessous de bras (underarm) : celui du devant (x positif) est pris.",
    )
    fraction: float = Field(
        ...,
        description="Fraction de la longueur du bord, sans unité : 0 à son début, 1 à sa fin, dans le sens du bord.",
        ge=0.0,
        le=1.0,
    )


class CuffOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["cuff"] = Field(..., description="Poignet.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    heightMm: float | None = Field(
        60, description="Hauteur du poignet fini, en mm.", ge=20.0, le=150.0
    )
    style: Style | None = Field(
        "barrel",
        description="barrel : poignet droit, boutonné ; french : poignet mousquetaire, replié, pour boutons de manchette.",
    )
    easeMm: float | None = Field(
        60,
        description="Aisance du poignet autour du tour de poignet, en mm.",
        ge=0.0,
        le=200.0,
    )
    overlapMm: float | None = Field(
        20,
        description="Croisure du poignet (recouvrement du boutonnage), en mm.",
        ge=0.0,
        le=60.0,
    )
    material: garment_spec_schema.MaterialKey | None = Field(
        "main",
        description="Matière du poignet et des pattes de fente : clé de la table materials du document.",
        validate_default=True,
    )


class BandOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["band"] = Field(..., description="Bande rapportée.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    edge: Edge = Field(
        ...,
        description="Bord longé (rôle de GarmentSpec) : hem, bas du corps ; sleeveHem, bas de manche.",
    )
    heightMm: float = Field(
        ...,
        description="Hauteur de la bande, mesurée depuis le bord, en mm.",
        ge=10.0,
        le=300.0,
    )
    material: garment_spec_schema.MaterialKey = Field(
        ..., description="Matière de la bande : clé de la table materials du document."
    )
    name: PieceName = Field(
        ...,
        description="Nom de la bande sur les patrons (ex. Bande d'ourlet) ; une bande d'ourlet donne une pièce devant et une pièce dos, que le rejeu distingue.",
    )


class PlacketOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["placket"] = Field(..., description="Patte de boutonnage.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    lengthMm: float = Field(
        ...,
        description="Longueur de la patte sous le milieu de l'encolure, en mm.",
        ge=40.0,
        le=700.0,
    )
    widthMm: float | None = Field(
        30, description="Largeur de la patte finie, en mm.", ge=10.0, le=80.0
    )
    buttonCount: int | None = Field(
        3,
        description="Nombre de boutons, répartis sur la longueur de la patte.",
        ge=0,
        le=20,
    )
    buttonDiameterMm: float | None = Field(
        13, description="Diamètre des boutons, en mm.", ge=6.0, le=40.0
    )
    material: garment_spec_schema.MaterialKey | None = Field(
        "main",
        description="Matière des pattes : clé de la table materials du document.",
        validate_default=True,
    )


class EmbroideryOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["embroidery"] = Field(..., description="Broderie.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    widthMm: float | None = Field(
        32, description="Largeur de la zone de broderie, en mm.", ge=5.0, le=150.0
    )
    motif: Motif | None = Field(
        "leaves", description="Motif brodé : leaves, feuilles alternées sur une tige."
    )
    withPlacket: bool | None = Field(
        True, description="La zone longe aussi la patte de boutonnage, s'il y en a une."
    )
    material: garment_spec_schema.MaterialKey = Field(
        ...,
        description="Fil de la broderie : clé de la table materials du document (en général de genre embroidery).",
    )


class AnchorPoint(
    RootModel[EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor]
):
    root: EdgeXAnchor | EdgeYAnchor | EdgeFractionAnchor | LandmarkAnchor | PointAnchor = Field(
        ...,
        description="Point ancré, dans le repère de la pièce de l'opération, selon ses champs : bord et abscisse (EdgeXAnchor), bord et ordonnée (EdgeYAnchor), bord et fraction de sa longueur (EdgeFractionAnchor), repère et décalage (LandmarkAnchor), ou coordonnées (PointAnchor). Un point ancré à un bord ou à un repère suit la taille et les mesures ; des coordonnées dépendent de la base.",
    )


class Path(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    points: list[AnchorPoint] = Field(
        ...,
        description="Points du chemin, dans l'ordre (2 à 32).",
        max_length=32,
        min_length=2,
    )
    smooth: bool | None = Field(
        False,
        description="Courbe lisse qui passe par tous les points (Catmull-Rom) ; false : segments droits.",
    )


class StyleLineRegion(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: PieceName = Field(
        ...,
        description="Nom de la région sur les patrons (ex. Plastron, Empiècement devant).",
    )
    material: garment_spec_schema.MaterialKey = Field(
        ..., description="Matière de la région : clé de la table materials du document."
    )
    insidePoint: AnchorPoint | None = Field(
        None,
        description="Point situé dans la partie retenue. Absent : la plus petite des deux parties, par l'aire.",
    )


class PocketOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["pocket"] = Field(..., description="Poche plaquée.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    side: Side | None = Field(
        "left",
        description="Côté du porteur où se pose la poche : left, sa gauche ; right, sa droite.",
    )
    position: AnchorPoint | None = Field(
        {"landmark": "armholeBottom", "xFraction": 0.55, "dyMm": -40},
        description="Milieu du bord haut de la poche, donné sur la moitié du devant d'abscisses positives ; side choisit le côté du porteur.",
        validate_default=True,
    )
    widthMm: float | None = Field(
        120, description="Largeur de la poche finie, en mm.", ge=40.0, le=300.0
    )
    heightMm: float | None = Field(
        135, description="Hauteur de la poche finie, en mm.", ge=40.0, le=350.0
    )
    shape: Shape1 | None = Field(
        "straight", description="straight : rectangulaire ; pointed : fond en pointe."
    )
    material: garment_spec_schema.MaterialKey | None = Field(
        "main",
        description="Matière de la poche : clé de la table materials du document.",
        validate_default=True,
    )


class TrimOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["trim"] = Field(..., description="Galon.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    side: Side1 | None = Field(
        "both",
        description="Côté du porteur : left, sa gauche ; right, sa droite ; both, les deux, symétriques.",
    )
    path: Path = Field(..., description="Axe du galon, sans prolongement.")
    widthMm: float | None = Field(
        40,
        description="Largeur du galon, en mm ; le chemin en est l'axe.",
        ge=3.0,
        le=200.0,
    )
    material: garment_spec_schema.MaterialKey = Field(
        ..., description="Matière du galon : clé de la table materials du document."
    )
    name: garment_spec_schema.MarkLabel | None = Field(
        None,
        description="Nom du galon sur les patrons et dans les fournitures : une ligne, jamais de donnée de client. Absent : le nom de sa matière.",
    )


class StyleLineOperation(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: OperationId
    op: Literal["styleLine"] = Field(..., description="Découpe.")
    enabled: bool | None = Field(
        True,
        description="Opération active ; false : masquée, gardée dans le document mais non rejouée.",
    )
    piece: BasePiece | None = Field("front", description="Pièce coupée.")
    line: StyleLinePreset | YokePreset | Path = Field(
        ...,
        description="Tracé de la découpe : préréglage partant de l'épaule (StyleLinePreset), empiècement (YokePreset) ou chemin libre (Path).",
    )
    extendMm: float | None = Field(
        15,
        description="Prolongement d'un chemin libre à ses deux bouts, dans le sens de ses extrémités, en mm, pour qu'il croise franchement le contour (un préréglage est prolongé de 15 mm).",
        ge=0.0,
        le=100.0,
    )
    region: StyleLineRegion
    topstitch: bool | None = Field(
        True,
        description="Surpiqûre le long de la découpe, montrée sur le dessin technique.",
    )


class DesignOperation(
    RootModel[
        HemShapeOperation
        | NecklineOperation
        | SleeveLengthOperation
        | CuffOperation
        | SideSlitOperation
        | BandOperation
        | StyleLineOperation
        | NeckSlitOperation
        | PlacketOperation
        | PocketOperation
        | TrimOperation
        | EmbroideryOperation
    ]
):
    root: (
        HemShapeOperation
        | NecklineOperation
        | SleeveLengthOperation
        | CuffOperation
        | SideSlitOperation
        | BandOperation
        | StyleLineOperation
        | NeckSlitOperation
        | PlacketOperation
        | PocketOperation
        | TrimOperation
        | EmbroideryOperation
    ) = Field(
        ...,
        description="Opération d'un document de modèle (ADR 0020), choisie par op. Une opération est générique : elle ne lit que des rôles de bords (EdgeSemanticRole de GarmentSpec) et des repères de pièce, jamais un nom de vêtement. Champs communs : id (unique dans le document), op et enabled. Longueurs en mm ; coordonnées dans le repère de la pièce (voir PointAnchor : y vers le bas, à l'inverse de GarmentSpec). Un paramètre absent prend sa valeur par défaut (default) : elle fait partie du contrat et ne change pas, sinon les documents enregistrés se rejoueraient autrement. Ces schémas et leurs descriptions sont aussi les outils de l'assistant (ADR 0023). Phases du rejeu, règles que le schéma ne peut pas dire et tracés des préréglages : docs/composants/contrats.md.",
        discriminator="op",
        title="DesignOperation",
    )

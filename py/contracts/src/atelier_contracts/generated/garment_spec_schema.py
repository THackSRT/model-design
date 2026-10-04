# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, RootModel


class SpecVersion(StrEnum):
    field_1_0 = "1.0"
    field_1_1 = "1.1"


class Engine(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str
    version: str


class Garment(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    type: str


class PointItem(RootModel[float]):
    root: float = Field(..., ge=-10000.0, le=10000.0)


class Point(RootModel[list[PointItem]]):
    root: list[PointItem] = Field(
        ...,
        description="[x, y] en millimètres, chaque coordonnée entre -10 000 et 10 000 mm (10 m, bornes comprises) : un vêtement réel tient sous 3 m ; la borne refuse une entrée hostile dès la validation (ADR 0013, MAX_COORDINATE_MM du drapé).",
        max_length=2,
        min_length=2,
    )


class Role(StrEnum):
    seam = "seam"
    fold = "fold"
    hem = "hem"
    waistline = "waistline"
    opening = "opening"


class EdgeSemanticRole(StrEnum):
    neckline = "neckline"
    shoulder = "shoulder"
    armhole = "armhole"
    side = "side"
    hem = "hem"
    centerFront = "centerFront"
    centerBack = "centerBack"
    sleeveCap = "sleeveCap"
    underarm = "underarm"
    sleeveHem = "sleeveHem"
    waist = "waist"
    inseam = "inseam"
    outseam = "outseam"
    rise = "rise"
    dart = "dart"
    styleLine = "styleLine"


class Zone(StrEnum):
    torso = "torso"
    leg = "leg"
    arm = "arm"


class BodySide(StrEnum):
    left = "left"
    right = "right"
    center = "center"


class Facing(StrEnum):
    front = "front"
    back = "back"
    outer = "outer"


class Landmark(StrEnum):
    neck = "neck"
    shoulder = "shoulder"
    waist = "waist"
    hip = "hip"
    crotch = "crotch"
    knee = "knee"
    ankle = "ankle"
    wrist = "wrist"


class Anchor(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    point: Point
    landmark: Landmark = Field(..., description="Repère de hauteur du corps ajusté.")
    offsetMm: float | None = Field(
        0,
        description="Décalage vertical depuis le repère, en millimètres, positif vers le haut.",
        ge=-500.0,
        le=500.0,
    )


class PanelPlacement(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    zone: Zone = Field(..., description="Partie du corps autour de laquelle la pièce s'enroule.")
    bodySide: BodySide = Field(
        ...,
        description="Côté du porteur (sa gauche, sa droite, ou à cheval sur le milieu) où va la pièce telle que dessinée.",
    )
    facing: Facing = Field(
        ...,
        description="Face du corps vers laquelle regarde l'endroit de la pièce ; outer pour une pièce enroulée autour d'un membre.",
    )
    anchor: Anchor = Field(
        ...,
        description="Point de la pièce posé sur la ligne médiane de la face facing, à la hauteur du repère landmark plus offsetMm.",
    )
    clearanceMm: float | None = Field(
        30,
        description="Distance au corps de la position de départ, en millimètres.",
        ge=5.0,
        le=150.0,
    )


class Side(StrEnum):
    left = "left"
    right = "right"


class EdgeRef(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    panelId: str
    edgeId: str
    side: Side | None = Field(
        None,
        description="Exemplaire du bord à coudre, côté du porteur, quand la règle de la couture (Seam) ne suffit pas. Absent : règle de Seam.",
    )


class Seam(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    a: EdgeRef
    b: EdgeRef
    easeMm: float | None = Field(
        None,
        description="Embu : le bord a est plus long que le bord b de cette valeur, qui se répartit en le cousant sur b (ex. tête de manche). Absent : 0, les deux bords ont la même longueur.",
        ge=0.0,
        le=50.0,
    )


class NotchPlacement(BaseModel):
    edgeId: str
    distanceMm: float = Field(..., ge=0.0, le=10000.0)
    count: int | None = Field(
        1,
        description="Cran simple, double (dos, par convention) ou triple.",
        ge=1,
        le=3,
    )


class Notch(NotchPlacement):
    model_config = ConfigDict(
        extra="forbid",
    )


class MaterialKey(RootModel[str]):
    root: str = Field(
        ...,
        description="Clé d'une matière dans GarmentSpec.materials (ex. main, contrast, bogolan) : un identifiant, jamais affiché.",
        pattern="^[a-z][A-Za-z0-9-]{0,63}$",
    )


class Material(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str = Field(
        ...,
        description="Nom affiché sur le plan de coupe, la liste de coupe et les fournitures (ex. Coton blanc). Texte d'une ligne, jamais de donnée de client.",
        max_length=80,
        min_length=1,
        pattern="^[^\\x00-\\x1F\\x7F]+$",
    )


class MarkLabel(RootModel[str]):
    root: str = Field(
        ...,
        description="Texte court écrit près de la marque sur les patrons (ex. poche, galon rayé) : une ligne, jamais de donnée de client.",
        max_length=80,
        min_length=1,
        pattern="^[^\\x00-\\x1F\\x7F]+$",
    )


class MarkCopy(StrEnum):
    drawn = "drawn"
    mirrored = "mirrored"


class LineMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["line"]
    points: list[Point] = Field(
        ...,
        description="Points de la ligne, dans l'ordre.",
        max_length=1000,
        min_length=2,
    )
    material: MaterialKey | None = Field(
        None,
        description="Matière posée sur la ligne (ex. galon) : clé de GarmentSpec.materials. Absente : simple repère.",
    )
    widthMm: float | None = Field(
        None,
        description="Largeur de ce qui se pose sur la ligne (ex. galon), en millimètres ; la ligne en est l'axe.",
        gt=0.0,
        le=300.0,
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class OutlineMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["outline"]
    points: list[Point] = Field(
        ...,
        description="Sommets du contour, dans l'ordre ; le dernier rejoint le premier.",
        max_length=1000,
        min_length=3,
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class ButtonMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["button"]
    points: list[Point] = Field(
        ..., description="Centre du bouton (un point).", max_length=1, min_length=1
    )
    diameterMm: float | None = Field(
        None, description="Diamètre du bouton, en millimètres.", ge=3.0, le=80.0
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class SlitMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["slit"]
    points: list[Point] = Field(
        ..., description="Début et fin de la fente.", max_length=2, min_length=2
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class ZoneMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["zone"]
    points: list[Point] = Field(
        ...,
        description="Sommets du contour de la zone, dans l'ordre ; le dernier rejoint le premier.",
        max_length=1000,
        min_length=3,
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class FoldMark(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    kind: Literal["fold"]
    points: list[Point] = Field(
        ..., description="Extrémités de la ligne de pli.", max_length=2, min_length=2
    )
    label: MarkLabel | None = None
    copy_: MarkCopy | None = Field(None, alias="copy")


class Edge(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    from_: Point = Field(..., alias="from")
    to: Point
    controls: list[Point] | None = Field(
        None,
        description="Points de contrôle d'une courbe de Bézier (1 : quadratique, 2 : cubique). Absent : segment droit.",
        max_length=2,
    )
    role: Role | None = Field(
        None,
        description="Rôle structurel : comment le bord se coupe et se finit (valeur de couture par rôle, pliure). seam : couture ; fold : pliure de coupe d'une pièce cutOnFold ; hem : ourlet ; waistline : bord de taille ; opening : bord laissé libre (ex. encolure). Absent : seam. Où se trouve le bord sur le vêtement : semanticRole.",
    )
    semanticRole: EdgeSemanticRole | None = None


class PlacementMark(
    RootModel[LineMark | OutlineMark | ButtonMark | SlitMark | ZoneMark | FoldMark]
):
    root: LineMark | OutlineMark | ButtonMark | SlitMark | ZoneMark | FoldMark = Field(
        ...,
        description="Marque de pose d'une pièce (1.1, ADR 0020), dans le repère de la pièce dessinée (mm, y vers le haut, vue côté endroit, comme ses bords), selon kind : line (ligne ouverte), outline (contour fermé), button (bouton), slit (fente à couper), zone (zone fermée à orner), fold (ligne de pli intérieure). Un contour fermé ne répète pas son premier point.",
    )


class Panel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: str
    name: str
    edges: list[Edge] = Field(
        ...,
        description="Contour fermé, dans le sens trigonométrique : la fin de chaque bord est le début du suivant.",
        min_length=3,
    )
    grainline: list[Point] | None = Field(
        None, description="Droit fil : deux points.", max_length=2, min_length=2
    )
    quantity: int = Field(..., description="Nombre de pièces à couper.", ge=1)
    cutOnFold: bool | None = False
    notches: list[Notch] | None = Field(
        None,
        description="Crans posés par le moteur (tête de manche et emmanchures, milieux, ligne des hanches, arrêt de fente). Sur un bord cousu avec embu (Seam.easeMm), le cran se place le long de ce bord, embu compris : le cran qui lui répond sur l'autre bord n'est pas à la même distance.",
        max_length=200,
    )
    placement: PanelPlacement | None = None
    material: MaterialKey | None = Field(
        None,
        description="Matière de la pièce (1.1) : clé de GarmentSpec.materials. Absente : matière non précisée ; la coupe regroupe ces pièces dans une même matière.",
    )
    interfaced: bool | None = Field(
        None,
        description="Pièce entoilée (1.1) : elle se coupe aussi dans l'entoilage, même forme et même nombre. Absent : pièce non entoilée.",
    )
    marks: list[PlacementMark] | None = Field(
        None,
        description="Marques de pose de la pièce (1.1, ADR 0020) : poche, galon, boutons, fentes, zone de broderie, plis. Absent ou vide : aucune marque.",
        max_length=100,
    )


class GarmentSpec(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    specVersion: SpecVersion = Field(
        ...,
        description="Version du format. Un producteur écrit 1.1 dès qu'il remplit un champ de la version 1.1 (materials, Panel.material, Panel.interfaced, Panel.marks, Edge.semanticRole), 1.0 sinon ; un lecteur 1.1 lit les deux.",
    )
    unit: Literal["mm"]
    engine: Engine
    garment: Garment
    panels: list[Panel] = Field(..., min_length=1)
    seams: list[Seam]
    estimatedMeasurements: list[str] | None = Field(
        None,
        description="Mesures absentes de la demande, estimées par le moteur : noms de champs de MeasurementSet (ex. bustGirthMm). Absent ou vide : aucune estimation.",
    )
    materials: dict[str, Material] | None = Field(
        None,
        description="Table des matières du vêtement (1.1), par clé au format MaterialKey : Panel.material et LineMark.material y renvoient, et toute clé citée y figure. Absente : matière unique, non nommée.",
        max_length=50,
    )

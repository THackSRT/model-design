# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from typing import Dict

from pydantic import BaseModel, ConfigDict, Field, RootModel, constr

from .. import measurement_set_schema
from . import design_operation_schema


class DocumentVersion(StrEnum):
    field_1_0 = "1.0"


class BaseKey(StrEnum):
    brian = "brian"
    teagan = "teagan"
    titan = "titan"
    sandy = "sandy"
    bella = "bella"
    straight_skirt = "straight-skirt"


class BaseOptions1(RootModel[float]):
    root: float = Field(..., ge=-1000.0, le=1000.0)


class BaseOptions2(RootModel[str]):
    root: str = Field(..., pattern="^[A-Za-z0-9_-]{1,64}$")


class BaseOptions(
    RootModel[dict[constr(pattern=r"^[a-z][A-Za-z0-9]{0,63}$"), BaseOptions1 | bool | BaseOptions2]]
):
    root: dict[constr(pattern=r"^[a-z][A-Za-z0-9]{0,63}$"), BaseOptions1 | bool | BaseOptions2] = (
        Field(
            ...,
            description="Options FreeSewing de la base, par nom (ex. lengthBonus, chestEase) : pourcentage en fraction comme dans FreeSewing (0.28 pour 28 %), angle en degrés, nombre entier, booléen ou valeur d'une liste. La longueur et l'aisance générales du vêtement sont des options de la base, pas des opérations. Le rejeu refuse une option que la base n'a pas, d'un autre type ou hors de ses bornes. Absentes : options par défaut de la base.",
            max_length=64,
        )
    )


class ChartSize(StrEnum):
    cisFemaleAdult28 = "cisFemaleAdult28"
    cisFemaleAdult30 = "cisFemaleAdult30"
    cisFemaleAdult32 = "cisFemaleAdult32"
    cisFemaleAdult34 = "cisFemaleAdult34"
    cisFemaleAdult36 = "cisFemaleAdult36"
    cisFemaleAdult38 = "cisFemaleAdult38"
    cisFemaleAdult40 = "cisFemaleAdult40"
    cisFemaleAdult42 = "cisFemaleAdult42"
    cisFemaleAdult44 = "cisFemaleAdult44"
    cisFemaleAdult46 = "cisFemaleAdult46"
    cisMaleAdult32 = "cisMaleAdult32"
    cisMaleAdult34 = "cisMaleAdult34"
    cisMaleAdult36 = "cisMaleAdult36"
    cisMaleAdult38 = "cisMaleAdult38"
    cisMaleAdult40 = "cisMaleAdult40"
    cisMaleAdult42 = "cisMaleAdult42"
    cisMaleAdult44 = "cisMaleAdult44"
    cisMaleAdult46 = "cisMaleAdult46"
    cisMaleAdult48 = "cisMaleAdult48"
    cisMaleAdult50 = "cisMaleAdult50"


class MaterialKind(StrEnum):
    plain = "plain"
    bogolan = "bogolan"
    geometric = "geometric"
    weave = "weave"
    stripes = "stripes"
    gingham = "gingham"
    stripedTrim = "stripedTrim"
    greekKeyTrim = "greekKeyTrim"
    embroidery = "embroidery"


class Color(RootModel[str]):
    root: str = Field(
        ...,
        description="Couleur sRGB #rrggbb, en minuscules.",
        pattern="^#[0-9a-f]{6}$",
    )


class DesignBase(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    key: BaseKey
    freesewingVersion: str = Field(
        ...,
        description="Version de FreeSewing qui trace la base (ex. 4.10.2). Le rejeu refuse une version que le moteur de tracé n'embarque pas : une montée de version de FreeSewing (ADR 0019) dit comment les documents enregistrés passent à la nouvelle.",
        pattern="^[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}$",
    )
    options: BaseOptions | None = None


class SizeMeasurements(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    size: ChartSize


class CustomMeasurements(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    measurementSet: measurement_set_schema.MeasurementSet


class DesignMaterial(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    name: str = Field(
        ...,
        description="Nom affiché (ex. Coton blanc), recopié dans GarmentSpec.materials : mêmes règles que Material.name de GarmentSpec, une ligne de 80 caractères au plus, jamais de donnée de client.",
        max_length=80,
        min_length=1,
        pattern="^[^\\x00-\\x1F\\x7F]+$",
    )
    kind: MaterialKind
    colors: list[Color] = Field(
        ...,
        description="Couleurs de la matière, de la plus visible à la moins visible (1 à 4) : fond d'un uni, teinte dominante d'un imprimé, motif d'un galon, fil d'une broderie ; les suivantes sont les couleurs secondaires du motif, que le dessin complète au besoin d'après le genre.",
        max_length=4,
        min_length=1,
    )


class DesignMeasurements(RootModel[SizeMeasurements | CustomMeasurements]):
    root: SizeMeasurements | CustomMeasurements = Field(
        ...,
        description="Mesures du porteur, complètes pour la base : une taille d'un tableau (SizeMeasurements) ou un jeu de mesures (CustomMeasurements). Le moteur de tracé ne déduit rien et n'appelle aucun autre moteur (ADR 0024) : le même document se rejoue à l'identique partout.",
    )


class DesignMaterials(BaseModel):
    model_config = ConfigDict(
        extra="allow",
    )
    __annotations__ = {
        "__pydantic_extra__": Dict[str, DesignMaterial],
    }
    main: DesignMaterial


class DesignDocument(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    documentVersion: DocumentVersion = Field(
        ...,
        description="Version du format. Il s'élargit en version mineure (1.1, 1.2…) quand s'ajoute une opération, une base, un repère, un paramètre ou une valeur permise ; un lecteur accepte toutes les versions mineures qu'il connaît, un producteur n'écrit la nouvelle que s'il en emploie un apport.",
    )
    base: DesignBase
    measurements: DesignMeasurements
    materials: DesignMaterials
    operations: list[design_operation_schema.DesignOperation] = Field(
        ...,
        description="Opérations, dans l'ordre (64 au plus ; vide : le vêtement neutre de la base). Le rejeu applique les opérations actives par phase, puis dans l'ordre de la liste ; annuler retire ou rétablit une opération et rejoue. Chaque id est unique dans la liste : le rejeu le vérifie, le schéma ne refuse que deux opérations identiques.",
        max_length=64,
    )

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import Enum, StrEnum

from pydantic import BaseModel, ConfigDict, Field, RootModel


class FabricWeighing(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    sampleMassG: float = Field(
        ..., description="Masse de l'échantillon, en grammes.", gt=0.0, le=1000.0
    )
    sampleAreaMm2: float = Field(
        ...,
        description="Aire de l'échantillon, en millimètres carrés (50 × 50 mm au moins, 1 m² au plus).",
        ge=2500.0,
        le=1000000.0,
    )


class ReadingsMmItem(RootModel[float]):
    root: float = Field(..., ge=0.01, le=10.0)


class FabricThicknessTest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    readingsMm: list[ReadingsMmItem] = Field(
        ...,
        description="Lectures en différents points de l'échantillon, en millimètres.",
        max_length=32,
        min_length=1,
    )


class StripStretchTest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    stripWidthMm: float = Field(
        ...,
        description="Largeur de la bande, en millimètres (50 mm recommandés).",
        ge=10.0,
        le=100.0,
    )
    gaugeLengthMm: float = Field(
        ...,
        description="Distance entre les repères avant la mise en charge (bande suspendue, sans masse), en millimètres (200 mm recommandés).",
        ge=50.0,
        le=1000.0,
    )
    loadedLengthMm: float = Field(
        ...,
        description="Distance entre les repères sous la masse, en millimètres ; au moins gaugeLengthMm.",
        ge=50.0,
        le=2000.0,
    )
    hangingMassG: float = Field(
        ...,
        description="Masse suspendue à la bande, pince comprise, en grammes (1 000 g donnent 9,81 N, proche de la charge de référence).",
        ge=50.0,
        le=5000.0,
    )


class OverhangLengthsMmItem(RootModel[float]):
    root: float = Field(..., ge=5.0, le=500.0)


class CantileverBendingTest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    overhangLengthsMm: list[OverhangLengthsMmItem] = Field(
        ...,
        description="Longueurs en porte-à-faux lues sur la règle, en millimètres (quatre recommandées : chaque extrémité, chaque face).",
        max_length=32,
        min_length=1,
    )


class SlideAnglesDegItem(RootModel[float]):
    root: float = Field(..., gt=0.0, le=75.0)


class CounterSurface(StrEnum):
    dress_form_cover = "dress-form-cover"
    skin_substitute = "skin-substitute"
    same_fabric = "same-fabric"
    other = "other"


class InclinedPlaneFrictionTest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    slideAnglesDeg: list[SlideAnglesDegItem] = Field(
        ...,
        description="Angles de la planche au moment du glissement, en degrés par rapport à l'horizontale.",
        max_length=32,
        min_length=1,
    )
    counterSurface: CounterSurface = Field(
        ...,
        description="Surface d'appui : dress-form-cover (housse d'un buste de couture), skin-substitute (peau synthétique), same-fabric (le tissu lui-même), other. Le moteur de drapé modélise le frottement du tissu sur le corps.",
    )


class SpecimenDiameterMm(Enum):
    number_300 = 300


class DiscDiameterMm(Enum):
    number_180 = 180


class MeasuredDrape(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    drapeCoefficient: float = Field(
        ...,
        description="Coefficient de drapé, sans unité (0 : tombe à la verticale ; 1 : reste plat).",
        ge=0.0,
        le=1.0,
    )
    specimenDiameterMm: SpecimenDiameterMm = Field(
        ...,
        description="Diamètre de l'éprouvette circulaire, en millimètres. Seul l'essai de 300 mm est comparable à l'essai simulé.",
    )
    discDiameterMm: DiscDiameterMm = Field(
        ..., description="Diamètre du disque support, en millimètres."
    )


class FabricBenchMeasurements(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    weighing: FabricWeighing | None = None
    thickness: FabricThicknessTest | None = None
    stretchWarp: StripStretchTest | None = None
    stretchWeft: StripStretchTest | None = None
    bendingWarp: CantileverBendingTest | None = None
    bendingWeft: CantileverBendingTest | None = None
    friction: InclinedPlaneFrictionTest | None = None
    drape: MeasuredDrape | None = None

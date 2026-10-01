# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class DrapeEase(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    minMm: float = Field(..., ge=-1000.0, le=2000.0)
    medianMm: float = Field(..., ge=-1000.0, le=2000.0)
    maxMm: float = Field(..., ge=-1000.0, le=2000.0)
    tightAreaMm2: float = Field(
        ...,
        description="Surface du vêtement où l'aisance est nulle (tissu au contact du corps), en mm².",
        ge=0.0,
        le=100000000.0,
    )


class DrapeResult(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    modelKey: str = Field(
        ...,
        description="Clé de l'objet dans le seau privé des drapés : drapes/<organizationId>/<cacheKey>.glb. Jamais d'URL publique.",
        max_length=120,
        pattern="^drapes/[0-9a-f-]{36}/[a-f0-9]{64}[.]glb$",
    )
    sizeBytes: int = Field(..., ge=1, le=268435456)
    sha256: str = Field(..., pattern="^[a-f0-9]{64}$")
    ease: DrapeEase
    maxStrainPercent: float = Field(
        ...,
        description="Allongement relatif maximal du tissu, en pourcentage (négatif : compression partout).",
        ge=-100.0,
        le=1000.0,
    )
    fabricEstimated: bool = Field(
        ..., description="Vrai si une propriété du tissu vient d'un préréglage estimé."
    )
    engineVersion: str = Field(..., max_length=64, min_length=1)
    vertexCount: int = Field(..., ge=1, le=30000)
    simulatedSteps: int = Field(..., ge=0, le=1000000)
    converged: bool = Field(
        ...,
        description="Vrai si la vitesse maximale est restée sous 1 mm/s pendant 10 pas avant la fin.",
    )

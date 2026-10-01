# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, ConfigDict, Field

from ..drape import drape_result_schema


class Status(StrEnum):
    pending = "pending"
    completed = "completed"
    failed = "failed"


class ProblemType(StrEnum):
    field_problems_drape_placement_missing = "/problems/drape-placement-missing"
    field_problems_drape_placement_failed = "/problems/drape-placement-failed"
    field_problems_drape_seam_not_closed = "/problems/drape-seam-not-closed"
    field_problems_drape_body_penetration = "/problems/drape-body-penetration"
    field_problems_drape_too_large = "/problems/drape-too-large"
    field_problems_drape_internal = "/problems/drape-internal"
    field_problems_drape_timeout = "/problems/drape-timeout"


class Drape(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    id: UUID
    status: Status = Field(
        ...,
        description="pending : en calcul ; completed : modèle disponible ; failed : voir problemType. Un drapé encore pending 10 minutes après createdAt est lu failed (drape-timeout).",
    )
    problemType: ProblemType | None = Field(
        None,
        description="Seulement si status vaut failed. Types de drape.failed, plus /problems/drape-timeout.",
    )
    ease: drape_result_schema.DrapeEase | None = Field(
        None, description="Seulement si status vaut completed."
    )
    maxStrainPercent: float | None = Field(
        None,
        description="Seulement si status vaut completed. Allongement relatif maximal, en pourcentage.",
        ge=-100.0,
        le=1000.0,
    )
    fabricEstimated: bool | None = Field(
        None,
        description="Seulement si status vaut completed. Vrai si le tissu vient d'un préréglage estimé.",
    )
    createdAt: AwareDatetime
    completedAt: AwareDatetime | None = Field(
        None, description="Fin du calcul (completed ou failed), en UTC."
    )

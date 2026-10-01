# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class Type(StrEnum):
    field_problems_drape_placement_missing = "/problems/drape-placement-missing"
    field_problems_drape_placement_failed = "/problems/drape-placement-failed"
    field_problems_drape_seam_not_closed = "/problems/drape-seam-not-closed"
    field_problems_drape_body_penetration = "/problems/drape-body-penetration"
    field_problems_drape_too_large = "/problems/drape-too-large"
    field_problems_drape_internal = "/problems/drape-internal"


class DrapeFailed(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    drapeId: UUID
    designId: UUID
    versionNumber: int = Field(..., ge=1)
    organizationId: UUID
    type: Type = Field(
        ...,
        description="placement-missing : une pièce sans Panel.placement ; placement-failed : pose initiale impossible ; seam-not-closed : couture encore ouverte à la fin ; body-penetration : tissu dans le corps à la fin ; too-large : plus de 40 pièces, 2 000 bords ou 30 000 sommets ; internal : erreur du moteur.",
    )
    retryable: bool = Field(
        ...,
        description="Vrai si la même demande peut réussir plus tard (erreur passagère) ; faux si elle échouera encore.",
    )

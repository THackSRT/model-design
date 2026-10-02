# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from . import design_version_summary_schema


class DesignVersionPage(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    designId: UUID
    items: list[design_version_summary_schema.DesignVersionSummary] = Field(..., max_length=100)
    nextCursor: str | None = Field(
        None,
        description="Curseur opaque de la page suivante (versions plus anciennes). Absent : dernière page.",
        max_length=64,
        min_length=1,
    )

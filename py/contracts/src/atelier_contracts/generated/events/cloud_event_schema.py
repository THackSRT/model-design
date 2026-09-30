# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import AwareDatetime, BaseModel, Field


class CloudEventEnvelope(BaseModel):
    specversion: Literal["1.0"]
    id: UUID
    source: str = Field(..., description="Service éditeur, ex. /services/designs")
    type: str = Field(..., pattern="^[a-z-]+\\.[a-z_]+(\\.v[0-9]+)?$")
    subject: str | None = None
    time: AwareDatetime
    datacontenttype: Literal["application/json"]
    data: dict[str, Any]

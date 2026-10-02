# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field

from .. import avatar_options_schema
from ..drape import fabric_schema


class Quality(StrEnum):
    draft = "draft"
    standard = "standard"


class DrapeRequest(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    fabric: fabric_schema.Fabric
    avatar: avatar_options_schema.AvatarOptions | None = Field(
        None, description="Absent : défauts du studio, comme {}."
    )
    quality: Quality | None = Field(
        "standard", description="draft (arête de 25 mm) ou standard (arête de 15 mm)."
    )

# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import BaseModel, ConfigDict

from . import fabric_schema


class FabricPhysics(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
    )
    weightGPerM2: fabric_schema.WeightGPerM2
    thicknessMm: fabric_schema.ThicknessMm
    stretchWarpPercent: fabric_schema.StretchWarpPercent
    stretchWeftPercent: fabric_schema.StretchWeftPercent
    bendingRigidityMicroNm: fabric_schema.BendingRigidityMicroNm
    frictionCoefficient: fabric_schema.FrictionCoefficient

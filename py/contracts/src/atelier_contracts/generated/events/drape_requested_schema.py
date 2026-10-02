# Généré par tools/contracts/generate.mjs depuis contracts/ — ne pas modifier à la main.

from __future__ import annotations

from pydantic import Field, RootModel

from ..drape import drape_job_schema


class DrapeRequested(RootModel[drape_job_schema.DrapeJob]):
    root: drape_job_schema.DrapeJob = Field(
        ...,
        description="Données de l'événement drape.requested : une tâche de drapé (DrapeJob). Contient des mesures : jamais journalisée.",
        title="DrapeRequested",
    )

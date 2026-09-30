[project]
name = "atelier-__name__"
version = "0.1.0"
description = "Moteur __name__ (à décrire en une phrase)."
requires-python = ">=3.12,<3.13"
dependencies = ["atelier-contracts", "atelier-engine-kit", "fastapi>=0.118", "uvicorn>=0.37"]

[tool.uv.sources]
atelier-contracts = { workspace = true }
atelier-engine-kit = { workspace = true }

[build-system]
requires = ["uv_build>=0.8.17,<0.9"]
build-backend = "uv_build"

[tool.uv.build-backend]
module-name = "__name_snake__"

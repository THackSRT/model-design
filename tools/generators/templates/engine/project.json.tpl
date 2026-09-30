{
  "name": "__name__",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "projectType": "application",
  "tags": ["type:engine", "lang:python"],
  "targets": {
    "lint": { "command": "uv run ruff check engines/__name__ && uv run ruff format --check engines/__name__ && uv run lint-imports --config engines/__name__/.importlinter", "options": { "cwd": "{workspaceRoot}", "env": { "PYTHONUTF8": "1" } } },
    "typecheck": { "command": "uv run mypy engines/__name__/src", "options": { "cwd": "{workspaceRoot}" } },
    "test": { "command": "uv run pytest engines/__name__/tests", "options": { "cwd": "{workspaceRoot}" } },
    "dev": { "command": "uv run uvicorn __name_snake__.main:app --reload", "options": { "cwd": "{workspaceRoot}" } }
  }
}

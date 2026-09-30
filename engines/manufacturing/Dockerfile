# Construire depuis la racine du dépôt : docker build -f engines/manufacturing/Dockerfile .
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /repo
COPY pyproject.toml uv.lock ./
COPY py ./py
COPY engines/manufacturing ./engines/manufacturing
RUN uv sync --frozen --no-dev --package atelier-manufacturing
USER nobody
CMD ["uv", "run", "--no-sync", "uvicorn", "manufacturing.main:app", "--host", "0.0.0.0", "--port", "8000"]

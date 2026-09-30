# Construire depuis la racine du dépôt : docker build -f engines/drape/Dockerfile .
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /repo
COPY pyproject.toml uv.lock ./
COPY py ./py
COPY engines/drape ./engines/drape
RUN uv sync --frozen --no-dev --package atelier-drape
USER nobody
CMD ["uv", "run", "--no-sync", "uvicorn", "drape.main:app", "--host", "0.0.0.0", "--port", "8000"]

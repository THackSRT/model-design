# Construire depuis la racine du dépôt : docker build -f engines/patterning/Dockerfile .
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /repo
COPY pyproject.toml uv.lock ./
COPY py ./py
COPY engines/patterning ./engines/patterning
RUN uv sync --frozen --no-dev --package atelier-patterning
USER nobody
CMD ["uv", "run", "--no-sync", "uvicorn", "patterning.main:app", "--host", "0.0.0.0", "--port", "8000"]

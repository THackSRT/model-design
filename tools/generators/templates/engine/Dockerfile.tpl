# Construire depuis la racine du dépôt : docker build -f engines/__name__/Dockerfile .
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
WORKDIR /repo
COPY pyproject.toml uv.lock ./
COPY py ./py
COPY engines/__name__ ./engines/__name__
RUN uv sync --frozen --no-dev --package atelier-__name__
USER nobody
CMD ["uv", "run", "--no-sync", "uvicorn", "__name_snake__.main:app", "--host", "0.0.0.0", "--port", "8000"]

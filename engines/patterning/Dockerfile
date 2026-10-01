# syntax=docker/dockerfile:1
# Moteur patterning. Depuis la racine du dépôt :
#   docker build -f engines/patterning/Dockerfile -t atelier/patterning .
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PYTHON_DOWNLOADS=never UV_PROJECT_ENVIRONMENT=/app/.venv
WORKDIR /repo
COPY pyproject.toml uv.lock ./
COPY py ./py
COPY engines ./engines
# Environnement du seul moteur, installé (non éditable) : le code source ne part pas dans l'image finale.
# Certificat d'autorité facultatif (proxy d'entreprise) : --secret id=ca,src=<fichier>. Jamais copié dans l'image.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,target=/root/.cache/uv \
  sh -c 'if [ -s /run/secrets/ca ]; then export SSL_CERT_FILE=/run/secrets/ca; fi; uv sync --frozen --no-dev --no-editable --package atelier-patterning'

FROM python:3.12-slim-bookworm
COPY --from=build /app/.venv /app/.venv
# Licence MIT de GarmentCode (référence de conception des tracés, ADR 0010).
COPY --from=build /repo/engines/patterning/THIRD_PARTY_NOTICES.md /app/THIRD_PARTY_NOTICES.md
ENV PATH=/app/.venv/bin:$PATH PYTHONUNBUFFERED=1 PORT=8000
USER nobody
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD python -c "import os, urllib.request; urllib.request.urlopen(f'http://127.0.0.1:{os.environ[\"PORT\"]}/health')"
CMD ["sh", "-c", "exec uvicorn patterning.main:app --host 0.0.0.0 --port $PORT"]

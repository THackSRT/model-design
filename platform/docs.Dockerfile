# syntax=docker/dockerfile:1
# Documentation MkDocs, construite puis servie par nginx.
#   docker build -f platform/docs.Dockerfile -t atelier/docs .
FROM python:3.12-slim AS build
WORKDIR /repo
# Mêmes bornes que le groupe « docs » de pyproject.toml.
# Certificat d'autorité facultatif (proxy d'entreprise) : --secret id=ca,src=<fichier>. Jamais copié dans l'image.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,target=/root/.cache/pip \
  sh -c 'if [ -s /run/secrets/ca ]; then export PIP_CERT=/run/secrets/ca; fi; pip install "mkdocs>=1.6,<2" "mkdocs-material>=9.6,<10"'
# Tout le dépôt (filtré par .dockerignore) : les pages incluent AGENTS.md, CHANGELOG.md et contracts/ (--8<--).
COPY . .
RUN mkdocs build --strict

FROM nginx:1.29-alpine
COPY --from=build /repo/site /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1

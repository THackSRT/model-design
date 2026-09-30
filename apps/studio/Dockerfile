# syntax=docker/dockerfile:1
# Studio web, servi par nginx qui joue aussi la passerelle locale (/api/<service> -> service).
#   docker build -f apps/studio/Dockerfile -t atelier/studio .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
WORKDIR /repo
COPY . .
# Certificat d'autorité facultatif (proxy d'entreprise) : --secret id=ca,src=<fichier>. Jamais copié dans l'image.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -c 'if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; corepack enable && pnpm install --frozen-lockfile'
RUN pnpm --filter "@atelier/studio..." run build

FROM nginx:1.29-alpine
COPY apps/studio/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/apps/studio/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s CMD wget -q -O /dev/null http://127.0.0.1:8080/ || exit 1

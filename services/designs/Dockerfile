# syntax=docker/dockerfile:1
# Service designs. Depuis la racine du dépôt :
#   docker build -f services/designs/Dockerfile -t atelier/designs .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
WORKDIR /repo
COPY . .
# Certificat d'autorité facultatif (proxy d'entreprise) : --secret id=ca,src=<fichier>. Jamais copié dans l'image.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -c 'if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; corepack enable && pnpm install --frozen-lockfile'
# Le service et ses bibliothèques, dans l'ordre des dépendances.
RUN pnpm --filter "@atelier/designs..." run build
# Paquet autonome : dist, migrations et dépendances de production seulement.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -c 'if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; pnpm --filter @atelier/designs deploy --prod --legacy /out'

FROM node:22-slim
ENV NODE_ENV=production PORT=3101 MIGRATIONS_DIR=migrations
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 3101
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]

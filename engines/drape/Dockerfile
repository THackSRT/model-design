# syntax=docker/dockerfile:1
# Moteur drape (TypeScript). Depuis la racine du dépôt :
#   docker build -f engines/drape/Dockerfile -t atelier/drape .
FROM node:22-slim AS build
ENV PNPM_HOME=/pnpm PATH=/pnpm:$PATH CI=true
WORKDIR /repo
COPY . .
# Certificat d'autorité facultatif (proxy d'entreprise) : --secret id=ca,src=<fichier>. Jamais copié dans l'image.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -c 'if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; corepack enable && pnpm install --frozen-lockfile'
RUN pnpm --filter "@atelier/drape..." run build
# Paquet autonome : dist et dépendances de production seulement.
RUN --mount=type=secret,id=ca,required=false --mount=type=cache,id=pnpm,target=/pnpm/store \
  sh -c 'if [ -s /run/secrets/ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/ca; fi; pnpm --filter @atelier/drape deploy --prod --legacy /out'

FROM node:22-slim
ENV NODE_ENV=production PORT=8000
WORKDIR /app
COPY --from=build --chown=node:node /out ./
USER node
EXPOSE 8000
HEALTHCHECK --interval=10s --timeout=3s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "dist/main.js"]

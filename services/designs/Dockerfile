# Construire depuis la racine du dépôt : docker build -f services/designs/Dockerfile .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm nx run @atelier/designs:build

FROM node:22-slim
WORKDIR /app
COPY --from=build /repo /repo
WORKDIR /repo/services/designs
USER node
CMD ["node", "dist/main.js"]

# Construire depuis la racine du dépôt : docker build -f services/__name__/Dockerfile .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile && pnpm nx run @atelier/__name__:build

FROM node:22-slim
WORKDIR /app
COPY --from=build /repo /repo
WORKDIR /repo/services/__name__
USER node
CMD ["node", "dist/main.js"]

# Multi-stage build for the whole workspace. docker-compose.yml picks the
# target for each service: `api`, `migrate` and `web`.

FROM node:24-slim AS build
# Installs the pnpm version pinned in package.json's packageManager
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /app

# Install dependencies first so this layer is cached until the lockfile changes
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json lib/api-spec/
COPY lib/api-zod/package.json lib/api-zod/
COPY lib/db/package.json lib/db/
COPY lib/game-core/package.json lib/game-core/
COPY docs/package.json docs/
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm --filter @kanz/api run build
RUN NODE_ENV=production pnpm --filter @kanz/web run build

# One-shot job that syncs the Drizzle schema to Postgres
FROM build AS migrate
CMD ["pnpm", "--filter", "@kanz/db", "run", "push"]

# API server: the esbuild bundle is self-contained, so no node_modules needed
FROM node:24-slim AS api
WORKDIR /app
ENV NODE_ENV=production PORT=8080 MEDIA_DIR=/data/media
RUN mkdir -p /data/media && chown node:node /data/media
COPY --from=build /app/apps/api/dist ./dist
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s \
  CMD ["node", "-e", "fetch('http://localhost:8080/api/healthz').then(r => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "--enable-source-maps", "dist/index.mjs"]

# Frontend: static files served by nginx, which also proxies /api
FROM nginx:stable-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist/public /usr/share/nginx/html
EXPOSE 80

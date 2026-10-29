# syntax=docker/dockerfile:1.7
# =====================================================================
# Backend NestJS — imagen multi-stage
# Contexto de build: raíz del monorepo
#   docker build -f backend/Dockerfile -t club-api .
# =====================================================================
FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g pnpm@12.10.1
WORKDIR /app

# ---------------------------------------------------------------------
# Dependencias de desarrollo (para compilar)
# ---------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile --filter club-deportivo-backend

# ---------------------------------------------------------------------
# Compilación
# ---------------------------------------------------------------------
FROM deps AS build
COPY backend ./backend
RUN pnpm --filter club-deportivo-backend exec prisma generate \
 && pnpm --filter club-deportivo-backend run build

# ---------------------------------------------------------------------
# Dependencias de producción + Prisma Client generado
# ---------------------------------------------------------------------
FROM base AS prod-deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY backend/package.json ./backend/package.json
COPY frontend/package.json ./frontend/package.json
COPY backend/prisma ./backend/prisma
RUN pnpm install --frozen-lockfile --prod --filter club-deportivo-backend \
 && pnpm --filter club-deportivo-backend exec prisma generate

# ---------------------------------------------------------------------
# Target para ejecutar migraciones en el release
#   docker run --rm club-api:migrator
# ---------------------------------------------------------------------
FROM prod-deps AS migrator
WORKDIR /app/backend
CMD ["./node_modules/.bin/prisma", "migrate", "deploy"]

# ---------------------------------------------------------------------
# Runtime mínimo
# ---------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    PORT=3001
WORKDIR /app
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd --system --gid 1001 nodejs \
 && useradd --system --uid 1001 --gid nodejs nestjs

COPY --from=prod-deps --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=prod-deps --chown=nestjs:nodejs /app/backend/prisma ./backend/prisma
COPY --from=build --chown=nestjs:nodejs /app/backend/dist ./backend/dist
COPY --chown=nestjs:nodejs backend/package.json ./backend/package.json
COPY --chown=nestjs:nodejs backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

USER nestjs
EXPOSE 3001
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["node", "backend/dist/main.js"]

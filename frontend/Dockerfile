# syntax=docker/dockerfile:1.7
# =====================================================================
# Frontend Next.js — imagen multi-stage con output standalone
# Contexto de build: raíz del monorepo
#   docker build -f frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1 \
#     -t club-web .
# =====================================================================
FROM node:22-alpine AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    CI=true \
    NEXT_TELEMETRY_DISABLED=1
RUN npm install -g pnpm@12.10.1
WORKDIR /app

# ---------------------------------------------------------------------
# Dependencias (incluye devDependencies: Next las necesita para buildear)
# ---------------------------------------------------------------------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY frontend/package.json ./frontend/package.json
COPY backend/package.json ./backend/package.json
RUN pnpm install --frozen-lockfile --filter frontend

# ---------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------
FROM deps AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY frontend ./frontend
RUN pnpm --filter frontend run build

# ---------------------------------------------------------------------
# Runtime: solo el servidor standalone + assets estáticos
# ---------------------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

COPY --from=build --chown=node:node /app/frontend/.next/standalone ./
COPY --from=build --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=build --chown=node:node /app/frontend/public ./frontend/public

USER node
EXPOSE 3000
CMD ["node", "frontend/server.js"]

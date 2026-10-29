#!/usr/bin/env bash
# Levanta PostgreSQL local, aplica migraciones Prisma y el seed de desarrollo.
set -euo pipefail

cd "$(dirname "$0")/.."

# Cargar POSTGRES_* del .env raíz (si existe).
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

DB_NAME="${POSTGRES_DB:-club_deportivo}"
DB_USER="${POSTGRES_USER:-club_deportivo}"
DB_PASS="${POSTGRES_PASSWORD:-club_deportivo_dev}"
DB_PORT="${POSTGRES_PORT:-5433}"

docker compose up -d db --wait

docker compose exec -T db pg_isready -U "$DB_USER" -d "$DB_NAME"

# Prisma es la única vía de creación del esquema.
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASS}@localhost:${DB_PORT}/${DB_NAME}?schema=public"
(cd backend && pnpm prisma migrate deploy)

# Seed idempotente (admin, canchas, franjas y equipamiento).
./scripts/db-seed.sh

echo "PostgreSQL listo en localhost:${DB_PORT}"

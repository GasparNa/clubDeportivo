#!/usr/bin/env bash
# Aplica el seed de desarrollo sobre la base local en Docker.
# Es idempotente: puede ejecutarse varias veces.
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

docker compose exec -T db psql \
  -U "${POSTGRES_USER:-club_deportivo}" \
  -d "${POSTGRES_DB:-club_deportivo}" \
  -v ON_ERROR_STOP=1 \
  < backend/db/seed/20-seed.sql

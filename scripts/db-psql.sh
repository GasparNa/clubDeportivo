#!/usr/bin/env bash
# Abre una consola psql dentro del contenedor.
set -euo pipefail

cd "$(dirname "$0")/.."

exec docker compose exec db psql \
  -U "${POSTGRES_USER:-club_deportivo}" \
  -d "${POSTGRES_DB:-club_deportivo}"

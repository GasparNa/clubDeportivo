#!/usr/bin/env bash
# Borra el volumen de datos y recrea la base desde cero.
set -euo pipefail

cd "$(dirname "$0")/.."

read -r -p "⚠️  Esto borra el volumen pgdata y todos los datos locales. ¿Continuar? [y/N] " ok

if [[ "$ok" != "y" ]]; then
  echo "Cancelado."
  exit 1
fi

docker compose down -v --remove-orphans
exec ./scripts/db-up.sh

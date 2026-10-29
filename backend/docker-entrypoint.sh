#!/bin/sh
# Entrypoint del backend en contenedor.
# RUN_MIGRATIONS=true aplica las migraciones pendientes antes de arrancar.
# En producción se recomienda usar el target `migrator` como paso de release.
set -eu

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Aplicando migraciones de Prisma..."
  cd /app/backend
  ./node_modules/.bin/prisma migrate deploy
  cd /app
fi

exec "$@"

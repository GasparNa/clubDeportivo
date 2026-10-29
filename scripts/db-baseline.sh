#!/usr/bin/env bash
# Regenera la migración baseline de Prisma desde el esquema autoritativo.
set -euo pipefail

cd "$(dirname "$0")/.."

OUT="backend/prisma/migrations/0001_baseline/migration.sql"
mkdir -p "$(dirname "$OUT")"

{
  cat <<'EOF'
-- =====================================================================
-- Migración baseline — Club Deportivo
-- Generada desde backend/db/esquema-final.sql (esquema autoritativo v3).
-- No editar a mano: regenerar con scripts/db-baseline.sh.
-- =====================================================================

EOF
  cat backend/db/esquema-final.sql
} > "$OUT"

echo "Baseline regenerado: $OUT ($(wc -l < "$OUT") líneas)"

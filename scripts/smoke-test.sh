#!/usr/bin/env bash
# Smoke test de un despliegue: health, disciplinas y login opcional.
# Uso:
#   ./scripts/smoke-test.sh http://localhost:3001
#   SMOKE_EMAIL=... SMOKE_PASSWORD=... ./scripts/smoke-test.sh https://api.dominio.com
set -euo pipefail

BASE_URL="${1:-${API_BASE_URL:-http://localhost:3001}}"
API_URL="${BASE_URL%/}/api/v1"

fallar() {
  echo "❌ $1" >&2
  exit 1
}

echo "→ Health: $API_URL/health"
HEALTH=$(curl -fsS --max-time 15 "$API_URL/health") || fallar "health no responde"
echo "$HEALTH" | grep -q '"status":"ok"' || fallar "health no devuelve status ok"
if echo "$HEALTH" | grep -q '"db":"down"'; then
  fallar "la base de datos figura caída"
fi
echo "✅ health OK"

echo "→ Disciplinas: $API_URL/disciplines"
DISCIPLINAS=$(curl -fsS --max-time 15 "$API_URL/disciplines") || fallar "disciplines no responde"
[ "$DISCIPLINAS" != "[]" ] || fallar "disciplines devolvió una lista vacía"
echo "✅ disciplinas OK"

if [ -n "${SMOKE_EMAIL:-}" ] && [ -n "${SMOKE_PASSWORD:-}" ]; then
  echo "→ Login: $SMOKE_EMAIL"
  LOGIN=$(curl -fsS --max-time 15 -X POST "$API_URL/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$SMOKE_EMAIL\",\"password\":\"$SMOKE_PASSWORD\"}") \
    || fallar "login falló"
  echo "$LOGIN" | grep -q '"access_token"' || fallar "login no devolvió access_token"
  echo "✅ login OK"
else
  echo "ℹ️  login omitido (definir SMOKE_EMAIL y SMOKE_PASSWORD para probarlo)"
fi

echo "🎉 smoke test OK contra $BASE_URL"

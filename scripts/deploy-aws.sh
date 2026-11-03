#!/usr/bin/env bash
# =====================================================================
# Script de despliegue en servidor AWS (EC2 / Lightsail con Docker + Caddy)
# Uso local en el servidor: ./scripts/deploy-aws.sh
# Requiere: BACKEND_IMAGE y FRONTEND_IMAGE exportadas (las define el CD).
# =====================================================================
set -Eeuo pipefail

APP_DIR="${APP_DIR:-/opt/club-deportivo}"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
ENV_FILE="${APP_DIR}/.env.prod"
DOMAIN="${DOMAIN_NAME:-clubdeportivo.alquilerespunilla.com.ar}"

log() { printf '\n[%s] %s\n' "$(date -Iseconds)" "$*"; }

on_error() {
  local exit_code=$?
  echo "❌ Despliegue fallido (código $exit_code)." >&2
  echo "--- docker compose ps ---" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps >&2 || true
  echo "--- últimos logs (caddy, backend, frontend) ---" >&2
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --tail 50 caddy backend frontend >&2 || true
  exit "$exit_code"
}
trap on_error ERR

log "Iniciando despliegue de Club Deportivo..."

# 1. Validaciones previas (fallan rápido y con mensaje claro)
command -v docker >/dev/null || { echo "❌ Docker no está instalado."; exit 1; }
docker compose version >/dev/null || { echo "❌ Docker Compose v2 no está disponible."; exit 1; }

[ -d "$APP_DIR" ] || { echo "❌ El directorio $APP_DIR no existe."; exit 1; }
[ -f "$COMPOSE_FILE" ] || { echo "❌ No se encontró $COMPOSE_FILE."; exit 1; }
[ -f "$ENV_FILE" ] || {
  echo "❌ No se encontró $ENV_FILE."
  echo "   Crearlo con POSTGRES_PASSWORD y JWT_SECRET antes de desplegar (ver docs/despliegueContinuo.md)."
  exit 1
}

: "${BACKEND_IMAGE:?Definir BACKEND_IMAGE (ej: ghcr.io/gasparna/clubdeportivo/backend:latest)}"
: "${FRONTEND_IMAGE:?Definir FRONTEND_IMAGE (ej: ghcr.io/gasparna/clubdeportivo/frontend:latest)}"
export BACKEND_IMAGE FRONTEND_IMAGE

cd "$APP_DIR"

log "Usando imágenes:"
echo "  backend  → ${BACKEND_IMAGE}"
echo "  frontend → ${FRONTEND_IMAGE}"

# 2. Validar que el compose resuelva con las variables actuales
log "Validando configuración de Docker Compose..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" config -q

# 3. Descargar las imágenes publicadas por el CD
log "Descargando imágenes de contenedores..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull

# 4. Levantar servicios y esperar a que los healthchecks estén sanos
log "Levantando servicios y esperando healthchecks (máx. 180s)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --remove-orphans --wait --wait-timeout 180

# 5. Verificar el endpoint público a través de Caddy (incluye emisión/renovación TLS)
log "Verificando estado de los servicios..."
ATTEMPTS=0
MAX_ATTEMPTS=24

until curl -fsS --max-time 10 "https://${DOMAIN}/api/v1/health" > /dev/null 2>&1 || [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "⏳ Esperando que el backend responda en Caddy (intento $ATTEMPTS/$MAX_ATTEMPTS)..."
  sleep 5
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
  echo "❌ El endpoint público https://${DOMAIN}/api/v1/health no respondió en el tiempo límite."
  exit 1
fi

log "✅ Despliegue completado con éxito en https://${DOMAIN}/"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

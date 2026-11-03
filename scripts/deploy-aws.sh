#!/usr/bin/env bash
# =====================================================================
# Script de despliegue en servidor AWS (EC2 / Lightsail con Docker + Caddy)
# Uso local en el servidor: ./scripts/deploy-aws.sh
# =====================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/club-deportivo}"
COMPOSE_FILE="${APP_DIR}/docker-compose.prod.yml"
DOMAIN="clubdeportivo.alquilerespunilla.com.ar"

echo "🚀 [$(date -Iseconds)] Iniciando despliegue de Club Deportivo..."

# 1. Verificar existencia del directorio y archivos requeridos
if [ ! -d "$APP_DIR" ]; then
  echo "❌ Error: Directorio de aplicación $APP_DIR no existe."
  exit 1
fi

cd "$APP_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Error: $COMPOSE_FILE no encontrado."
  exit 1
fi

if [ ! -f ".env.prod" ]; then
  echo "⚠️ Advertencia: .env.prod no existe en $APP_DIR. Verifique las variables de entorno."
fi

# 2. Descargar o actualizar imágenes más recientes
echo "📦 Descargando imágenes de contenedores..."
docker compose -f "$COMPOSE_FILE" --env-file .env.prod pull || echo "ℹ️ Continuará con build local si no se usan imágenes remotas."

# 3. Levantar servicios en segundo plano con recreate si hubo cambios
echo "🔄 Levantando servicios con Docker Compose..."
docker compose -f "$COMPOSE_FILE" --env-file .env.prod up -d --remove-orphans

# 4. Esperar y verificar estado de salud
echo "🩺 Verificando estado de los servicios..."
ATTEMPTS=0
MAX_ATTEMPTS=12

until curl -kfsS "https://${DOMAIN}/api/v1/health" > /dev/null 2>&1 || [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; do
  ATTEMPTS=$((ATTEMPTS + 1))
  echo "⏳ Esperando que el backend responda en Caddy (intento $ATTEMPTS/$MAX_ATTEMPTS)..."
  sleep 5
done

if [ $ATTEMPTS -ge $MAX_ATTEMPTS ]; then
  echo "⚠️ El endpoint público https://${DOMAIN}/api/v1/health no respondió en el tiempo límite."
  echo "Estado de los contenedores:"
  docker compose -f "$COMPOSE_FILE" ps
  echo "Últimos logs de caddy y backend:"
  docker compose -f "$COMPOSE_FILE" logs --tail 30 caddy backend
  exit 1
fi

echo "✅ Despliegue completado con éxito en https://${DOMAIN}/"

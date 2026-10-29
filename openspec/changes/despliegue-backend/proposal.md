## Why

El frontend ya está desplegado en Vercel (`https://club-deportivo-phi.vercel.app`) pero **no carga datos** porque el backend no está desplegado en ningún lado y, aun desplegándolo, el navegador bloquearía las llamadas por CORS: el backend solo permite `http://localhost:3000` y `:3001` (`backend/src/main.ts`). Esta change deja el backend listo para producción y deja registrado/trazeable el trabajo de despliegue.

## What Changes

- **CORS configurable por entorno**: nueva variable `CORS_ORIGINS` (lista separada por comas) en lugar de orígenes hardcodeados, para habilitar el dominio del frontend desplegado sin tocar código.
- **Binding en `0.0.0.0`** para que el proceso sea accesible desde contenedores/plataformas de deploy.
- **Nuevo endpoint `GET /api/v1/health`** (sin autenticación) como health check de la plataforma y verificación de que el deploy está vivo.
- **Blueprint de deploy** (`render.yaml`) con build/start/health check y las variables de entorno tipadas.
- **Guía de despliegue** (`docs/despliegue.md`) con la configuración de Vercel, variables por plataforma y checklists de diagnóstico (404 y bloqueo por CORS).
- Correcciones de `.env.example` (`PORT=3001` coherente con el frontend, `CORS_ORIGINS`) y del `.env.local` del frontend (`/api/v1` y puerto del backend).

## Capabilities

### New Capabilities
- `operacion-despliegue`: verificación de salud del servicio y configuración de orígenes CORS para entornos desplegados.

### Modified Capabilities
- Ninguna (no cambia ningún contrato de negocio existente).

## Impact

- **API**: nuevo endpoint público `GET /api/v1/health` (no altera endpoints existentes).
- **Backend**: `backend/src/main.ts`, nuevo módulo `backend/src/health/`, `backend/src/app.module.ts`, `backend/.env.example`.
- **Infraestructura**: `render.yaml` (nuevo), `docs/despliegue.md` (nuevo).
- **Sin migración de base de datos**: el esquema Prisma y los triggers no cambian. La conexión usa el pooler de Supabase en IPv4.
- **Pendiente del equipo** (requiere cuentas): crear el servicio en Render, cargar `DATABASE_URL` y `CORS_ORIGINS`, y setear `NEXT_PUBLIC_API_URL` en Vercel.
## Why

El CI actual valida lint, tipos, pruebas unitarias y OpenSpec en un solo job, pero no ejecuta las pruebas de integración contra PostgreSQL ni compila el frontend, de modo que una regresión de triggers SQL o un build de Next.js roto recién se descubre en el despliegue. Además, el CD despliega siempre la imagen `latest`, lo que impide saber con certeza qué commit está en producción, y el `paths-ignore` del `pull_request` permite mergear cambios sin validar las especificaciones.

El cambio afecta al equipo de desarrollo y operación (calidad de entrega y trazabilidad del despliegue); no modifica el comportamiento visible del sistema para SOCIO, GERENTE ni ADMINISTRADOR.

## What Changes

- `ci.yml` pasa a tener tres jobs independientes y con `timeout-minutes`:
  - `calidad`: lint de backend y frontend, generación de Prisma, typecheck del backend, `openspec validate --all --strict`, validación de `docker-compose.prod.yml` y pruebas unitarias con `pnpm --filter club-deportivo-backend exec jest --runInBand`.
  - `integracion-bd`: PostgreSQL 16 como service con healthcheck y `pnpm --filter club-deportivo-backend run test:db`, usando `TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/club_deportivo_test`.
  - `frontend`: build de Next.js (`pnpm --filter frontend run build`).
- Se quita `paths-ignore` del trigger `pull_request` (se mantiene en `push` a `main`/`develop`) para que `openspec validate` corra en todo PR.
- `cd.yml` publica y despliega la imagen del commit (`<sha-corto>`) en vez de `latest`, alineando el tag que genera `docker/metadata-action` con el del despliegue. `latest` se conserva como tag adicional de publicación.
- `cd.yml` toma `NEXT_PUBLIC_API_URL` de `vars.NEXT_PUBLIC_API_URL`, con la URL pública actual como valor por defecto.
- Se unifica pnpm en `12.10.1` en `ci.yml` y en `packageManager` de `frontend/package.json`.
- Se corrige/verifica la codificación UTF-8 sin BOM de `.github/workflows/ci.yml` (acentos en los nombres de pasos).
- **No** se tocan `security.yml`, `dependabot.yml`, código de aplicación, migraciones ni esquema de base de datos.

## Capabilities

### New Capabilities

Ninguna. El change es exclusivamente de tooling de CI/CD.

### Modified Capabilities

Ninguna. `openspec/specs/operacion-despliegue/spec.md` describe únicamente el endpoint de salud, la configuración de CORS y la escucha en `0.0.0.0`; no contiene requisitos sobre el pipeline de CI/CD, el tag de las imágenes ni la propagación de `NEXT_PUBLIC_API_URL`. Por eso el change declara `skip_specs: true` y no agrega delta de spec.

## Impact

- **CI**: `.github/workflows/ci.yml` (tres jobs, trigger de `pull_request`, pnpm `12.10.1`).
- **CD**: `.github/workflows/cd.yml` (tag por commit, `latest` adicional, `vars.NEXT_PUBLIC_API_URL`).
- **Frontend**: `frontend/package.json`, solo el campo `packageManager`; no cambian dependencias ni el lockfile.
- **Docker**: sin cambios en `backend/Dockerfile` ni `frontend/Dockerfile`; ambos ya instalan pnpm `12.10.1`.
- **Base de datos**: sin cambios de esquema ni migraciones; el nuevo job usa el esquema de referencia `backend/db/esquema-final.sql` a través de `test:db`.
- **Operación**: el compose de producción sigue aceptando `BACKEND_IMAGE`/`FRONTEND_IMAGE`, por lo que el despliegue por tag de commit no requiere cambios en el servidor. `latest` sigue disponible para rollback manual.

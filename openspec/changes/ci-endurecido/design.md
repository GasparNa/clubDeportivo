## Context

Ver `proposal.md` para la motivación. Estado actual relevante:

- `.github/workflows/ci.yml`: un único job `calidad` sin `timeout-minutes`. Corre `pnpm install --frozen-lockfile`, `openspec validate --all --strict`, lint de backend y frontend, `prisma:generate`, typecheck de backend, `docker compose -f docker-compose.prod.yml config -q` y `pnpm --filter club-deportivo-backend exec jest --runInBand`. El trigger `pull_request` tiene `paths-ignore`, así que un PR que solo toca `docs/**` o `**.md` no valida OpenSpec.
- `.github/workflows/cd.yml`: se dispara con `workflow_run` de CI en `main` o `workflow_dispatch`. Publica backend y frontend con `tags: type=raw,value=latest` + `type=sha,format=short`, pero el job de despliegue ignora esos tags y arma `ghcr.io/.../backend:latest` y `.../frontend:latest`. El `image_tag` calculado en `steps.vars` (`${GITHUB_SHA::7}`) hoy no se usa.
- `backend/test/db/`: suite `test:db` con `jest-db.config.js` (`maxWorkers: 1`, `globalSetup`). `setup-test-db.js` se conecta como administrador a la base `/postgres` del mismo servidor, hace `DROP DATABASE ... WITH (FORCE)` y `CREATE DATABASE`, y aplica `backend/db/esquema-final.sql`. Solo usa `pg` (no Prisma Client).
- `frontend/Dockerfile` hornea `NEXT_PUBLIC_API_URL` con `ARG`/`ENV` en la etapa `build`; el CD le pasa el valor fijo `https://clubdeportivo.alquilerespunilla.com.ar/api/v1`.
- Versiones de pnpm: `ci.yml` usa `12.8.1`, `frontend/package.json` declara `packageManager: pnpm@12.8.1`, y ambos Dockerfiles instalan `pnpm@12.10.1`. El lockfile es `lockfileVersion: '9.0'` y no contiene el campo `packageManager`.
- `.github/workflows/ci.yml` está en UTF-8 sin BOM y con acentos correctos; `security.yml` tiene mojibake, pero queda fuera de alcance.

## Goals / Non-Goals

**Goals:**

- Separar la validación en tres jobs con presupuesto de tiempo propio, de modo que un fallo de integración con PostgreSQL o del build de Next.js se vea como check independiente.
- Ejecutar `test:db` contra un PostgreSQL 16 efímero en cada PR.
- Desplegar exactamente el commit validado, sin depender de `latest`.
- Permitir cambiar la URL pública del API sin editar el workflow.
- Unificar pnpm en la versión que ya usan las imágenes (`12.10.1`).
- Dejar `ci.yml` en UTF-8 sin BOM con acentos correctos.

**Non-Goals:**

- No se agregan pruebas E2E Playwright ni stubs OpenAPI al CI (fase 5, fuera de este change).
- No se modifica `security.yml`, `dependabot.yml`, `scripts/deploy-aws.sh`, `docker-compose.prod.yml` ni `Caddyfile`.
- No se cambia el mecanismo de despliegue (SSH + Docker Compose + Caddy) ni el servidor.
- No se tocan código de `backend/src`, `frontend/src`, migraciones de Prisma ni `backend/db/esquema-final.sql`. No hay triggers ni migraciones involucradas: las reglas de negocio siguen viviendo en PostgreSQL y este change no las altera.
- No se agrega un script `typecheck` al frontend; el build de Next.js ya falla ante errores de TypeScript.

## Decisions

### 1. Tres jobs independientes y en paralelo

`calidad`, `integracion-bd` y `frontend` no tienen `needs` entre sí. Cada uno hace checkout, configura pnpm `12.10.1` y Node 22 con `cache: pnpm`, e instala con `--frozen-lockfile`. Los tres declaran `timeout-minutes` (20 para `calidad` y `integracion-bd`, 20 para `frontend`).

- **Motivo**: feedback aislado y cancelación por job; un fallo de BD no oculta el lint.
- **Alternativas consideradas**: un solo job con más pasos (menos duplicación de instalación, pero acopla tiempos y fallos) y una composite action propia (mejor reutilización, pero más indirección para un MVP). Se acepta duplicar la instalación porque la caché de pnpm la reduce a segundos.
- El orden interno de `calidad` se mantiene igual al actual para no cambiar semántica: OpenSpec → lint backend → lint frontend → `prisma:generate` → typecheck backend → compose → jest.

### 2. `pull_request` sin `paths-ignore`

Se elimina el bloque `paths-ignore` del trigger `pull_request`; en `push` a `main`/`develop` se conserva. Así `openspec validate --all --strict` corre en todo PR, incluido uno que solo cambia `docs/`.

- **Motivo**: un cambio de documentación puede desincronizar specs, y OpenSpec exige validación estricta antes del merge.
- **Alternativa**: job liviano separado solo para OpenSpec con `paths` — se descarta porque un PR mixto (docs + código) seguiría necesitando los tres jobs y la matriz se complica sin beneficio claro.

### 3. Job `integracion-bd` con service PostgreSQL 16

```yaml
services:
  postgres:
    image: postgres:16
    env:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: club_deportivo_test
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U postgres -d club_deportivo_test"
      --health-interval 5s
      --health-timeout 5s
      --health-retries 10
env:
  TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/club_deportivo_test
```

Paso de pruebas: `pnpm --filter club-deportivo-backend run test:db`.

- **Motivo de usuario `postgres`**: `global-setup.js` necesita permisos para `DROP`/`CREATE DATABASE`. Con un usuario no superusuario el setup fallaría.
- **Motivo de la base `/postgres`**: el setup usa `adminUrlFor()` sobre `TEST_DATABASE_URL`; la base `postgres` siempre existe en la imagen oficial, aunque `POSTGRES_DB` cree además `club_deportivo_test`.
- **No se necesita `prisma:generate`**: la suite usa `pg` y el SQL de referencia; `jest-db.config.js` usa `ts-jest` con `tsconfig.db.json`.
- **Alternativa**: `postgres:16-alpine` (arranque más rápido). Se usa `postgres:16` para igualar la versión declarada por el proyecto y evitar diferencias de libc/extensions.
- La recreación destructiva de la base queda contenida en el contenedor del service, que es efímero.

### 4. Job `frontend` con build de Next.js

Paso único de build: `pnpm --filter frontend run build` con `NEXT_PUBLIC_API_URL` de placeholder (`http://localhost:3001/api/v1`), ya que el valor real solo importa en la imagen de producción.

- **Motivo**: valida compilación, tipos y reglas de Next 16 (standalone) antes del CD.
- **Alternativa**: agregar `"typecheck": "tsc --noEmit"` a `frontend/package.json` y correrlo en `calidad`. Se descarta para mantener el cambio acotado; `next build` ya invoca el chequeo de tipos.

### 5. Tag inmutable por commit, compartido entre build y deploy

Una única fuente de verdad: `steps.vars.outputs.image_tag = ${REF::7}`.

```yaml
# build-and-push: expone el tag al job de despliegue
outputs:
  image_tag: ${{ steps.vars.outputs.image_tag }}

# build-and-push, paso vars
env:
  REF: ${{ github.event_name == 'workflow_run' && github.event.workflow_run.head_sha || github.sha }}
run: echo "image_tag=${REF::7}" >> "$GITHUB_OUTPUT"

# metadata de backend y frontend
tags: |
  type=raw,value=${{ steps.vars.outputs.image_tag }}
  type=raw,value=latest

# deploy-aws
env:
  IMAGE_TAG: ${{ needs.build-and-push.outputs.image_tag }}
run: |
  prefix="ghcr.io/$(echo '${{ github.repository }}' | tr '[:upper:]' '[:lower:]')"
  echo "backend=${prefix}/backend:${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
  echo "frontend=${prefix}/frontend:${IMAGE_TAG}" >> "$GITHUB_OUTPUT"
```

- **Motivo**: `docker/metadata-action` con `type=sha,format=short` genera `sha-abc1234`, mientras que el `image_tag` del workflow vale `abc1234`. Al usar `type=raw` en ambos lados, el tag publicado y el desplegado son idénticos. No se usa `steps.meta-*.outputs.version` porque con dos tags (`sha` y `latest`) su valor depende del orden y es más frágil de leer.
- **`latest` se mantiene** como tag adicional para rollback manual y para el valor por defecto de `docker-compose.prod.yml`.
- **`workflow_run` usa `head_sha`**: en ese evento `github.sha` es el HEAD de la rama por defecto y puede haber avanzado después del run de CI. Se usa `github.event.workflow_run.head_sha` con fallback a `github.sha` (caso `workflow_dispatch`), tanto en el `ref` del checkout como en el tag. El job `deploy-aws` conserva el checkout por defecto porque sincroniza `Caddyfile`, compose y script de configuración de `main`.
- Se agrega `timeout-minutes: 40` a `build-and-push` (hoy no tiene).

### 6. `NEXT_PUBLIC_API_URL` desde variable de repositorio

```yaml
build-args: |
  NEXT_PUBLIC_API_URL=${{ vars.NEXT_PUBLIC_API_URL || 'https://clubdeportivo.alquilerespunilla.com.ar/api/v1' }}
```

- **Motivo**: el valor se hornea en el bundle en tiempo de build; no puede venir del `.env.prod` del servidor. Una variable de repositorio permite cambiarlo sin tocar el YAML, y el fallback reproduce el comportamiento actual si la variable no está definida (GitHub evalúa una variable inexistente como cadena vacía y `||` toma el literal).
- **Alternativa**: `env:` a nivel de job con el literal — menos flexible; o un secreto — innecesario porque la URL es pública.

### 7. pnpm `12.10.1` unificado

- `ci.yml`: `pnpm/action-setup@v4` con `version: 12.10.1` en los tres jobs.
- `frontend/package.json`: `"packageManager": "pnpm@12.10.1"`.
- `pnpm/action-setup` usa el input `version` cuando está presente y solo lee `packageManager` si se omite; el valor explícito en CI sigue siendo la fuente de verdad.
- El cambio no altera dependencias ni `pnpm-lock.yaml` (`lockfileVersion: '9.0'`), así que `pnpm install --frozen-lockfile` sigue siendo válido. Como `packageManager` vive en `frontend/`, los comandos lanzados desde la raíz usan el pnpm del entorno (la raíz no declara `packageManager`); en pnpm ≥10, invocar `pnpm` dentro de `frontend/` puede conmutar a `12.10.1` por `manage-package-manager-versions`, que es precisamente la versión objetivo.
- **Alternativa**: declarar `packageManager` también en la raíz. Se descarta por alcance; el pedido apunta a `frontend/package.json` y a `ci.yml`.

### 8. Codificación UTF-8 sin BOM

Los archivos se editan con herramientas de edición (no con `Set-Content`/`Out-File`/`-replace`). `ci.yml` ya está sin BOM y con acentos correctos; se conserva así. La verificación es de solo lectura (bytes iniciales y decodificación UTF-8) más `git diff`, y no se toca `security.yml` aunque tenga mojibake.

## Risks / Trade-offs

- **Duplicación de `pnpm install` en tres jobs** → la caché de `setup-node` (`cache: pnpm`) y el lockfile congelado lo acotan; los `timeout-minutes` evitan jobs colgados.
- **El job de BD es más frágil** (arranque del service, recreación de base) → healthcheck con 10 reintentos, `globalSetup` con `WITH (FORCE)` y timeout de 20 minutos; se valida localmente con `pnpm --filter club-deportivo-backend run test:db` contra un PostgreSQL 16.
- **El service usa credenciales triviales** → son efímeras y exclusivas del runner; no se usan secretos reales.
- **Quitar `paths-ignore` en PR consume más minutos** → aceptado por la exigencia de `openspec validate`; si molesta, más adelante se puede dividir OpenSpec en un job liviano.
- **`head_sha` en `workflow_run`** → si GitHub no lo expone en algún caso, el fallback a `github.sha` mantiene el comportamiento actual; el tag podría apuntar a otro commit de `main`, algo que la primera corrida real debe confirmar comparando `git rev-parse HEAD` con el tag publicado.
- **Variable `NEXT_PUBLIC_API_URL` mal definida** → el build seguiría funcionando pero el frontend apuntaría a una URL incorrecta; el smoke test público detecta solo el health del backend. Se mitiga revisando el build-arg en el log del job y la variable en Settings.
- **Divergencia futura de tags** → el tag se define una sola vez en `steps.vars`; una prueba local con actionlint y la inspección del log de `docker/build-push-action` (`tags:` publicados) detectan cualquier regresión.
- **pnpm 12.10.1 local** → ya es la versión de ambos Dockerfiles; si el entorno local tiene otra, `--frozen-lockfile` no cambia el lockfile y el CI fija la versión explícita.

## Migration Plan

1. Implementar en la rama `feature/ci-endurecido` (ya creada) sin commit ni PR desde este change.
2. Abrir el PR y verificar en la primera corrida que `calidad`, `integracion-bd` y `frontend` aparecen como checks separados y en verde, y que OpenSpec corre aunque el PR solo toque docs. Tras ese primer PR verde, marcar los tres checks como obligatorios en la protección de `main` (Settings → Rules → Rulesets, o Branches) junto con la exigencia de PR obligatorio; es un paso manual del usuario.
3. Al mergear a `main`, CI dispara CD: confirmar en el log de `build-and-push` que se publican `<sha>` y `latest` para backend y frontend, y en el server (`docker compose -f /opt/club-deportivo/docker-compose.prod.yml --env-file /opt/club-deportivo/.env.prod ps --format '{{.Image}}'`) que los contenedores usan `:<sha>`. La ruta y el `--env-file` salen de `scripts/deploy-aws.sh` (`APP_DIR=/opt/club-deportivo`, `COMPOSE_FILE=$APP_DIR/docker-compose.prod.yml`, `ENV_FILE=$APP_DIR/.env.prod`).
4. **Rollback**: exportar `BACKEND_IMAGE`/`FRONTEND_IMAGE` con un tag anterior (`:<sha-anterior>` o `:latest`) y ejecutar `./scripts/deploy-aws.sh` en el servidor; también se puede relanzar `CD` con `workflow_dispatch`.
5. No hay migraciones de base de datos ni pasos de datos.

## Open Questions

- ¿Conviene, en una fase posterior, separar `openspec validate` en un job liviano para no ejecutar los tres jobs en PRs solo de documentación? No cambia este diseño ni las tareas.

# AGENTS.md

## Descripción del proyecto

Sistema de reservas de club deportivo (MVP). Enfoque API-First: los contratos se definen en OpenSpec y luego se implementan.

- **Backend**: NestJS + TypeScript
- **Base de datos**: PostgreSQL 16 en Docker (local y contenedor `db` en la EC2); RDS/Supabase quedan como alternativas históricas
- **Especificaciones**: OpenSpec (`@fission-ai/openspec`) en `openspec/`
- **Frontend**: Next.js 16 + React 19 + Tailwind 4
- **Infraestructura**: Docker + AWS (EC2 con Caddy y Docker Compose; Terraform/App Runner quedan como legado no aplicado)

## Comandos

```bash
# Instalación en raíz (ejecuta prisma skills sync)
pnpm install

# Backend (NestJS)
cd backend && pnpm run start:dev

# Tests, lint y typecheck (backend)
cd backend && pnpm run test
cd backend && pnpm run test:e2e
cd backend && pnpm run lint
cd backend && pnpm run typecheck

# OpenSpec
pnpm exec openspec validate --all --strict

# Docker (stack completo)
docker compose up -d --build
docker compose ps

# Smoke test de un despliegue
./scripts/smoke-test.sh http://localhost:3001

# Terraform (infra/terraform)
terraform fmt -check -recursive && terraform validate

# GitHub CLI — gestión de fases
gh pr list --label "feature"                          # Ver PRs de features activos
gh run list --branch main --limit 5                   # Últimos CI runs en main
./scripts/phase-workflow.sh <num> <nombre> <slug>     # Iniciar nueva fase (crea issue + rama + PR draft)
```

**Scripts disponibles en `backend/package.json`:** `test`, `test:e2e`, `lint`, `typecheck`.  
**Workflows en `.github/workflows/`:** `ci.yml` (lint + typecheck + test + OpenSpec) y `cd.yml` (build y push a GHCR + deploy SSH a la EC2 con Caddy y Docker Compose).

## Arquitectura

- **API-First**: definir specs en `openspec/specs/` antes de escribir código. Usar las skills de OpenSpec (`openspec-new-change`, `openspec-propose`, etc.) para impulsar el flujo de trabajo.
- **El esquema de base de datos es el código fuente autoritativo** hoy: `backend/db/esquema-final.sql` (1968 líneas). Las reglas de negocio se ejecutan via triggers de PostgreSQL, no en la aplicación.
- **Docker**: `backend/Dockerfile` y `frontend/Dockerfile` multi-stage (contexto de build: raíz del monorepo); `docker-compose.yml` levanta db + api + web.
- **Infraestructura AWS actual**: una EC2 con Docker Compose y Caddy como reverse proxy/TLS (`docs/despliegueContinuo.md`). `infra/terraform/` (VPC, RDS, ECR, App Runner, Route53) es legado validado pero **no aplicado**.
- **Contexto OpenSpec**: `openspec/config.yaml` define dominio, roles y reglas de negocio.

## Reglas clave de negocio (de los triggers)

- La reserva pertenece exactamente a una `Persona` (un `Usuario` o un invitado sin cuenta).
- Máximo 2 reservas `CONFIRMADA` por `Usuario` (advisory lock).
- La cancelación requiere 1 día de anticipación para reservas de autoservicio (`AUTOGESTIONADA`).
- Alquiler de equipamiento: stock se decrementa al insertar, se restaura al devolver/cancelar.
- 3+ infracciones de equipamiento → suspensión automática.
- `registros_auditoria` es solo-append (REVOKE UPDATE/DELETE).
- RLS habilitado en todas las tablas (hoy inerte: la app conecta como dueña de las tablas, sin policies).

## Convenciones

- **Idioma**: español para nombres de dominio, tablas, columnas y comentarios de código.
- **IDs**: UUIDs (pgcrypto `gen_random_uuid()`).
- **Bajas lógicas**: columna `estado` (`ACTIVO`/`INACTIVO`) + `inactivated_at`. No hay borrados físicos en entidades principales.
- **Timestamps**: `creado_en` / `actualizado_en` con zona horaria, auto-gestionados por triggers.
- **Flujo Git**: `main` protegido, PR con 1 aprobación requerida. Ramas de feature: `feature/<nombre>`.
- **Gestor de paquetes**: pnpm con configuración de workspace en `pnpm-workspace.yaml`.

## Estrategia de ramas por fase (Git Flow × tasks.md)

Cada fase definida en `openspec/changes/club-deportivo-reservas/tasks.md` se implementa en su propia rama. Esto permite integración continua (CI) con GitHub Actions, revisiones de PR aisladas y despliegues incrementales.

### Mapeo de fases → ramas

| Fase | Rama | Descripción | Estado |
|------|------|-------------|--------|
| 1 | `feature/gestion-usuarios-personas` | Registro, autenticación JWT, roles, suspensión | ✅ Completada |
| 2 | `feature/gestion-instalaciones-horarios` | CRUD disciplinas, canchas, franjas horarias | 🟡 Pendiente (2.5) |
| 3 | `feature/gestion-reservas-turnos` | Reservas, alquiler equipamiento, conflictos, stock | ✅ Completada |
| 4 | `feature/pagos-auditoria-notificaciones` | Pagos, auditoría, notificaciones email | ✅ Completada |
| 5 | `feature/integracion-validacion` | OpenAPI stubs, CI pipeline, despliegue, pruebas E2E | 🟡 Parcial: CI y despliegue hechos; faltan stubs OpenAPI y E2E |
| 6 | `feature/frontend-sdd` | Next.js, Tailwind v4, 27 pantallas, design system | ✅ Completada |

> Las fases de Docker/PostgreSQL y de infraestructura AWS son otro plan, con su
> propio checklist en `docs/resumen.md`. No confundirlas con estas fases de
> `tasks.md`.

### Workflow de rama por fase

```bash
# 1. Crear rama desde main para la fase a implementar
git checkout main && git pull
git checkout -b feature/<nombre-fase>

# 2. Implementar tareas de la fase (marcar [x] en tasks.md al completar cada una)

# 3. Ejecutar tests y lint antes de commit
cd backend && pnpm run test && pnpm run lint

# 4. Commit y push
git add -A
git commit -m "feat(<fase>): implementa tareas de <nombre-fase>"
git push -u origin feature/<nombre-fase>

# 5. Crear PR en GitHub (main ← feature/<nombre-fase>)
#    - Requiere 1 aprobación
#    - CI debe pasar (GitHub Actions)
#    - Squash merge a main

# 6. Merge y cleanup
git checkout main && git pull
git branch -d feature/<nombre-fase>
```

### Reglas de branching

- **`main`**: siempre deployable. Solo recibe merges vía PR aprobado con CI verde.
- **`feature/*`**: una rama por cada fase de `tasks.md`. Se crea desde `main` y se mergea de vuelta con squash.
- **No commits directos a `main`**. Todo cambio pasa por PR.
- **Nomenclatura**: `feature/<slug-de-la-fase>` (ej: `feature/gestion-usuarios-personas`).
- **Commits**: convencionales (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).

## Integración Continua con GitHub Actions

### Workflows definidos

Los workflows están en `.github/workflows/` y son la fuente de verdad; esta
sección solo los resume.

#### `ci.yml` — Integración continua (siempre corre)

| Disparador | `push` a `main`/`develop` y `pull_request` a `main` |
|---|---|
| Job `calidad` | `pnpm install --frozen-lockfile` → `prisma generate` → lint → typecheck → tests → `openspec validate --all --strict` |

Los tests son unitarios con mocks: no necesitan PostgreSQL ni variables
`DATABASE_URL`/`JWT_SECRET`. Node 22 y pnpm 12.8.1.

#### `cd.yml` — Construcción, publicación y despliegue

| Disparador | Al completar `ci.yml` en `main` (solo si fue exitoso) o `workflow_dispatch` |
|---|---|
| Job `build-and-push` | Login a GHCR → buildx → push de backend y frontend con tags `latest` y `sha-<corto>` |
| Job `deploy-aws` | Verifica secretos y servidor → `scp` de `Caddyfile`, `docker-compose.prod.yml` y `scripts/deploy-aws.sh` → SSH → `docker compose pull && up -d --wait` → smoke test público |

El frontend recibe `NEXT_PUBLIC_API_URL` como build-arg porque se hornea en el
bundle. El servidor solo descarga imágenes: `docker-compose.prod.yml` no tiene
bloques `build:`.

Si faltan `DEPLOY_HOST`, `DEPLOY_USER` o `DEPLOY_KEY`, el job **falla de forma
explícita** (no se omite en silencio). El aprovisionamiento inicial del
servidor (directorio `/opt/club-deportivo`, `.env.prod`, swap y DNS) está en
[`docs/despliegueContinuo.md`](../docs/despliegueContinuo.md).

#### Validación local de los workflows

```bash
docker run --rm -v "$PWD:/repo" -w /repo rhysd/actionlint:latest
docker run --rm -v "$PWD:/repo" -w /repo koalaman/shellcheck:stable scripts/smoke-test.sh
```

### Configuración de GitHub CLI (`gh`) para automatización

La CLI de GitHub (`gh`) se usa para gestionar PRs, issues y actions desde la terminal, agilizando el completamiento de fases.

#### Instalación y autenticación

```bash
# Instalar GitHub CLI
winget install --id GitHub.cli        # Windows
brew install gh                        # macOS
sudo apt install gh                    # Linux

# Autenticar
gh auth login
```

#### Comandos esenciales por fase

```bash
# --- Al iniciar una fase ---

# Crear issue de tracking para la fase
gh issue create \
  --title "Fase X: <nombre-fase>" \
  --body "Implementar tareas de la fase X según \`openspec/changes/club-deportivo-reservas/tasks.md\`" \
  --label "feature,phase-X" \
  --milestone "MVP Club Deportivo"

# Crear rama y PR draft
git checkout -b feature/<nombre-fase>
git push -u origin feature/<nombre-fase>
gh pr create \
  --base main \
  --head feature/<nombre-fase> \
  --title "feat: Fase X — <nombre-fase>" \
  --body "Closes #<issue-number>. Ver \`tasks.md\` para detalle de tareas." \
  --draft \
  --label "feature"

# --- Durante el desarrollo ---

# Ver estado del CI
gh run list --branch feature/<nombre-fase> --limit 5

# Ver logs de un workflow específico
gh run view <run-id> --log

# Re-ejecutar un workflow fallido
gh run rerun <run-id>

# --- Al completar la fase ---

# Marcar PR como listo para revisión
gh pr ready feature/<nombre-fase>

# Solicitar review
gh pr review --approve  # (si tienes permisos; normalmente lo hace otro)

# Hacer squash merge (vía UI o CLI)
gh pr merge feature/<nombre-fase> --squash --delete-branch

# Cerrar issue de tracking
gh issue close <issue-number> --comment "Fase completada. PR: #<pr-number>"
```

#### Script de automatización de fase (`scripts/phase-workflow.sh`)

```bash
#!/bin/bash
# Uso: ./scripts/phase-workflow.sh <numero-fase> <nombre-fase> <slug-rama>
# Ejemplo: ./scripts/phase-workflow.sh 5 "Integración y Validación" "integracion-validacion"

PHASE_NUM=$1
PHASE_NAME=$2
BRANCH_SLUG=$3

echo "🚀 Iniciando Fase $PHASE_NUM: $PHASE_NAME"

# Crear issue
ISSUE_URL=$(gh issue create \
  --title "Fase $PHASE_NUM: $PHASE_NAME" \
  --body "Implementar tareas de la fase $PHASE_NUM según \`openspec/changes/club-deportivo-reservas/tasks.md\`" \
  --label "feature,phase-$PHASE_NUM" \
  --milestone "MVP Club Deportivo")

echo "✅ Issue creado: $ISSUE_URL"

# Crear rama
git checkout main && git pull
git checkout -b "feature/$BRANCH_SLUG"
git push -u origin "feature/$BRANCH_SLUG"

# Crear PR draft
gh pr create \
  --base main \
  --head "feature/$BRANCH_SLUG" \
  --title "feat: Fase $PHASE_NUM — $PHASE_NAME" \
  --body "Implementa tareas de la Fase $PHASE_NUM. Ver \`tasks.md\`." \
  --draft \
  --label "feature"

echo "🎯 Rama feature/$BRANCH_SLUG lista. PR draft creado. ¡A programar!"
```

### Flujo completo de CI/CD por fase

```mermaid
graph TD
    A[main] -->|git checkout -b| B[feature/fase-X]
    B --> C[Implementar tareas]
    C --> D[git push + gh pr create --draft]
    D --> E[GitHub Actions: ci.yml]
    E -->|lint + typecheck + test + openspec + builds| F{¿CI verde?}
    F -->|No| C
    F -->|Sí| G[gh pr ready]
    G --> H[Revisión de PR]
    H -->|1 aprobación| I[gh pr merge --squash]
    I --> J[ci.yml en main]
    J --> K[cd.yml → build + push a GHCR]
    K --> L[deploy SSH → EC2 + Caddy]
    L --> M[main actualizado]
    M -->|Siguiente fase| A
```

Si faltan `DEPLOY_HOST`, `DEPLOY_USER` o `DEPLOY_KEY`, el job de deploy falla
con un mensaje explícito. Un push que solo toca `docs/` o `infra/` no dispara
CI (por `paths-ignore`) y, por lo tanto, tampoco CD: usar `workflow_dispatch`
para forzar un despliegue.

### Estados de CI requeridos para merge

| Check | Descripción | Workflow |
|-------|-------------|----------|
| `lint` | ESLint sin errores | `ci.yml` |
| `typecheck` | TypeScript compila sin errores | `ci.yml` |
| `test` | Tests unitarios pasan (Jest) | `ci.yml` |
| `openspec` | `openspec validate --all --strict` sin inconsistencias | `ci.yml` |

### Secretos de GitHub y variables del servidor

Secretos del repositorio (Settings → Secrets and variables → Actions → Secrets):

| Secreto | Uso |
|---------|-----|
| `DEPLOY_HOST` | IP pública de la instancia AWS (`3.15.211.73`) |
| `DEPLOY_USER` | Usuario SSH (`ubuntu`) |
| `DEPLOY_KEY` | Clave privada SSH completa (sin passphrase) |
| `DEPLOY_PORT` | Puerto SSH (opcional, por defecto `22`) |

Variables en el servidor (`/opt/club-deportivo/.env.prod`, permisos `600`):

| Variable | Uso |
|---------|-----|
| `POSTGRES_PASSWORD` | Contraseña de PostgreSQL (obligatoria) |
| `JWT_SECRET` | Secreto de firma JWT, mínimo 32 caracteres (obligatoria) |
| `POSTGRES_DB` / `POSTGRES_USER` | Base y usuario (por defecto `club_deportivo`) |
| `CORS_ORIGINS` | Origen permitido del frontend |
| `NEXT_PUBLIC_API_URL` | URL del API que se hornea en el build del frontend |

## Cuidados importantes

- `backend/` contiene la API NestJS completa en `src/`, el esquema Prisma en `prisma/` y los SQL de referencia en `db/`.
- `frontend/` contiene la aplicación Next.js (App Router, Tailwind 4) con sus propias dependencias y lockfile; el lockfile que manda es el de la raíz.
- No hay archivos `.env` commiteados: la configuración se carga por variables de entorno (`.env.example` en raíz, `backend/` y `frontend/`).
- `openspec/specs/` todavía no tiene specs sincronizadas; el trabajo vive en `openspec/changes/`.
- `openspec/changes/api-reservas` es un change vacío de scaffolding con `skip_specs: true` para no romper `validate --all --strict`.
- `infra/terraform/` está validado con `terraform validate` pero **no aplicado** y corresponde a la arquitectura App Runner (legado). El despliegue vigente es la EC2 documentada en `docs/despliegueContinuo.md`.
- AWS dejó de aceptar clientes nuevos en App Runner (octubre de 2026): no es una alternativa para esta cuenta.
- El CD despliega por SSH a `/opt/club-deportivo`; ese directorio, `.env.prod` y el swap se aprovisionan una sola vez (ver `docs/despliegueContinuo.md`).

## Documentos de referencia

- `backend/db/esquema-final.sql` — esquema completo y autoritativo de la BD con triggers
- `docs/modelo-datos.md` — diagrama ER y descripciones de entidades
- `docs/docker.md` — PostgreSQL local, imágenes y stack completo en Docker
- `docs/despliegue-aws.md` — infraestructura AWS, Terraform, CI/CD, rollback y costos
- `docs/resumen.md` — plan de despliegue por fases
- `openspec/config.yaml` — contexto de dominio para OpenSpec
- `openspec/changes/club-deportivo-reservas/tasks.md` — plan de tareas por fase (fuente de verdad para branching)
- `README.md` — descripción general del proyecto y roles
- `.github/workflows/ci.yml` — lint, typecheck, tests y OpenSpec
- `.github/workflows/cd.yml` — build y push a GHCR + deploy SSH a la EC2
- `docs/despliegueContinuo.md` — runbook del despliegue continuo (secretos, servidor, DNS, rollback)
- `infra/terraform/` — infraestructura como código (legado, no aplicada)
- `scripts/smoke-test.sh` — verificación de un despliegue
- `scripts/phase-workflow.sh` — script de automatización para iniciar una nueva fase

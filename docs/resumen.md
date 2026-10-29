# Resumen del proyecto y plan de despliegue Docker en AWS

> Documento de planificación. Estado del análisis: `main` @ `869952c` (26/10/2026).
> Actualización 26/10/2026: **Fases 1–6 completadas en código** (Prisma alineado con `@@map`, baseline `0001_baseline`, Dockerfiles y stack completo, hardening de runtime, Terraform validado, CI/CD y documentación AWS). Base PostgreSQL local operativa (rama `feature/postgres-docker`, ver `docs/docker.md`). El `terraform apply` y el primer despliegue real quedan pendientes de la Fase 0 (cuenta AWS, dominio y presupuesto).
> Objetivo: desplegar backend y frontend como contenedores Docker en **AWS App Runner**, con **RDS PostgreSQL** como base de datos e infraestructura provisionada con **Terraform**.

---

## 1. Resumen ejecutivo

El repositorio tiene un producto funcionalmente avanzado (API NestJS con 7 módulos, frontend Next.js con ~28 pantallas, esquema SQL con 18 triggers y RLS), pero **no está listo para Docker/AWS**:

- No existe ningún `Dockerfile` ni `.dockerignore`. Solo hay un `docker-compose.yml` que levanta PostgreSQL local (ver `docs/docker.md`); falta el compose full-stack.
- El workflow de CI (`.github/workflows/ci.yml`) está incompleto: termina en `pull_request.branches`, sin `jobs:` — **no ejecuta nada**.
- Las migraciones ya existen (`backend/prisma/migrations/0001_baseline`), pero falta verificar el deploy en RDS.
- El despliegue histórico era **Render + Vercel + Supabase** (`render.yaml`, `docs/despliegue.md`), con Docker declarado explícitamente fuera de alcance en `openspec/changes/despliegue-backend/design.md`. El camino vigente es **Docker + AWS** (`infra/terraform/`, `docs/despliegue-aws.md`).

**Conclusión:** la unificación del esquema y las migraciones (P0) ya está resuelta localmente. El siguiente bloqueante es verificar el deploy en RDS; los Dockerfiles y la infraestructura AWS vienen después.

---

## 2. El proyecto

### 2.1 Qué es

MVP de reservas para un club deportivo: socios reservan canchas por disciplina (Tenis, Fútbol, Pádel), con franjas horarias, alquiler de equipamiento con control de stock, pagos, auditoría y notificaciones.

**Roles:** `SOCIO`, `GERENTE`, `ADMINISTRADOR`, más invitados sin cuenta (personas sin usuario, cargadas por gerencia).

### 2.2 Stack

| Capa | Tecnología | Ubicación |
|---|---|---|
| Backend | NestJS 12 + TypeScript | `backend/src` |
| ORM | Prisma 5.22 | `backend/prisma/schema.prisma` |
| Frontend | Next.js 16.3.8 + React 19 + Tailwind 4 | `frontend/src` |
| Base de datos | PostgreSQL | `backend/db/esquema-final.sql` |
| Especificaciones | OpenSpec | `openspec/` |
| Despliegue objetivo | Docker + AWS App Runner + RDS + ECR | `infra/terraform/` |
| Despliegue histórico | Render + Vercel + Supabase (obsoleto) | `render.yaml`, `docs/despliegue.md` |

### 2.3 Backend

Módulos en `backend/src`:

```
auth/           JWT strategy, RolesGuard, ActiveUserGuard, SuspendedUserGuard
prisma/         PrismaService (global)
health/         GET /api/v1/health
usuarios/       registro, login, perfil, solicitudes de permiso, gestión de usuarios
instalaciones/  disciplinas, canchas, franjas horarias, disponibilidad
reservas/       reservas, equipamiento, alquileres
pagos/          pagos, auditoría, notificaciones
```

Aspectos relevantes para el despliegue:

| Aspecto | Estado | Referencia |
|---|---|---|
| Puerto | `process.env.PORT \|\| 3000` (`.env.example` usa 3001) | `backend/src/main.ts:50` |
| Binding | `0.0.0.0` (apto para contenedores) | `backend/src/main.ts:53` |
| CORS | Lista desde `CORS_ORIGINS`, fallback localhost | `backend/src/main.ts:16-38` |
| ValidationPipe | Global (`whitelist`, `forbidNonWhitelisted`, `transform`) | `backend/src/main.ts:41-47` |
| Prefijo de API | `/api/v1` declarado en cada `@Controller` | — |
| Health check | `{ status: 'ok' }`, **sin consultar la BD** | `backend/src/health/health.controller.ts:5-12` |
| Shutdown hooks | **No se llama `enableShutdownHooks()`** | `backend/src/main.ts` |
| Prisma al iniciar | Si falla la conexión, arranca en "modo offline" | `backend/src/prisma/prisma.service.ts:8-16` |
| JWT | Fallback inseguro `default-secret-change-me` si falta `JWT_SECRET` | `backend/src/auth/auth.module.ts:10` |
| Logs | `console.log` con emojis (no estructurados) | `backend/src/main.ts:54-73` |

### 2.4 Frontend

- Next.js 16 con App Router; `frontend/src/proxy.ts` hace de middleware (Next 16 renombró `middleware.ts` a `proxy.ts`).
- Todas las llamadas al API son client-side: `NEXT_PUBLIC_API_URL` (`frontend/src/lib/http-client.ts:6`), token en `localStorage` + cookie `SameSite=Lax` para el proxy.
- **No hay BFF ni rutas `app/api`**: el navegador llama directo al backend.
- `next.config.ts` está vacío → **no tiene `output: 'standalone'`**, requisito para una imagen liviana.
- `frontend/src/app/layout.tsx` usa `next/font/google` → el build necesita red.
- Existen **dos lockfiles/workspaces** (raíz y `frontend/`), lo que obliga a elegir el contexto de build.

### 2.5 Base de datos

| Fuente | Formato | Contenido |
|---|---|---|
| `backend/prisma/schema.prisma` | PascalCase, con `@@map` a snake_case | 12 modelos, alineados con las tablas del esquema |
| `backend/db/esquema-final.sql` | snake_case plural | 12 tablas, 18 triggers, RLS, seed de disciplinas |
| `docs/migracion-inicial.sql` | PascalCase | Generado por Prisma, sin triggers |
| `backend/db/schema.sql`, `esquemaUltimo.sql`, `persona.sql` | — | Versiones históricas obsoletas |

**Reglas de negocio que viven en triggers** (`esquema-final.sql`): máximo 2 reservas `CONFIRMADA` por usuario (advisory lock), anticipación de 1 día para cancelar reservas autogestionadas, decremento/restauración de stock de equipamiento, suspensión automática a las 3 infracciones, auditoría append-only.

> ⚠️ Si la base se creó desde Prisma, **estas reglas no están activas**. Hay que verificar antes de desplegar.

### 2.6 Estado de avance

Según `openspec/changes/club-deportivo-reservas/tasks.md`:

| Fase | Estado |
|---|---|
| 1. Usuarios y personas | ✅ completa |
| 2. Instalaciones y horarios | 🟡 falta 2.5 |
| 3. Reservas y turnos | 🟡 faltan 3.11–3.15 |
| 4. Pagos, auditoría y notificaciones | ✅ completa |
| 5. Integración y validación | 🔴 pendiente |
| 6. Frontend | ✅ completa |

---

## 3. Estado actual del despliegue

### 3.1 Lo que ya existe

- `render.yaml`: blueprint histórico para backend en Render (marcado obsoleto), build con `pnpm --filter`, `prisma generate`, health check `/api/v1/health`.
- `docs/despliegue.md`: guía histórica Vercel (frontend) + Render (backend) + Supabase (BD), incluyendo troubleshooting de CORS y 404.
- `backend/.env.example` con `DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRATION`, `PORT`, `NODE_ENV`, `CORS_ORIGINS`.
- `GET /api/v1/health` público y binding `0.0.0.0`.
- `docker-compose.yml` + `scripts/db-*.sh`: PostgreSQL 16 local en Docker (puerto 5433) con `esquema-final.sql` y seed de desarrollo. Ver `docs/docker.md`.

### 3.2 Lo que falta

| # | Gap | Evidencia |
|---|---|---|
| 1 | Docker incompleto | hay compose solo para PostgreSQL local; faltan `Dockerfile` de backend/frontend y `.dockerignore` |
| 2 | CI sin `jobs:` | `.github/workflows/ci.yml:1-6` |
| 3 | Esquemas BD incompatibles | `schema.prisma:13-241` vs `esquema-final.sql:32-1966` |
| 4 | Sin migraciones Prisma | `backend/prisma/migrations/` no existe |
| 5 | Frontend sin `standalone` | `frontend/next.config.ts:3-5` |
| 6 | Health no valida BD | `health.controller.ts:5-12` |
| 7 | Sin `enableShutdownHooks()` | `backend/src/main.ts` |
| 8 | JWT con fallback inseguro | `auth.module.ts:10` |
| 9 | Sin `lint`/`typecheck` en backend | `backend/package.json:6-18` |
| 10 | Sin `engines.node` ni `packageManager` en raíz | `package.json` |
| 11 | `test:e2e` apunta a un archivo inexistente | `backend/package.json:17` |
| 12 | RLS habilitado sin `CREATE POLICY` | `esquema-final.sql:1907-1941` |

> **Resueltos el 26/10/2026:** #3 (esquema Prisma alineado con `@@map`), #4 (migración `0001_baseline`) y #9 (`lint`/`typecheck` agregados).

---

## 4. Arquitectura objetivo

```
                    Route53
        app.<dominio>      api.<dominio>
              │                  │
        ┌─────▼─────┐      ┌─────▼─────┐
        │ App Runner│      │ App Runner│
        │ frontend  │─────▶│  backend  │
        │ :3000     │ HTTPS│  :3001    │
        └───────────┘      └─────┬─────┘
              │                  │ VPC Connector (ENIs en subnets privadas)
              │                  ▼
              │            ┌───────────┐
              │            │    RDS    │  PostgreSQL 16, privado, :5432
              │            │ t4g.micro │  sslmode=require
              │            └───────────┘
              │
        ECR (2 repos) ◀── GitHub Actions (OIDC, sin access keys)
        Secrets Manager (DATABASE_URL, JWT_SECRET)
        CloudWatch Logs + Alarmas
```

**Componentes:**

| Componente | Configuración |
|---|---|
| App Runner backend | Imagen ECR, puerto 3001, VPC Connector, health `/api/v1/health`, 0.25 vCPU / 0.5 GB, min 1 |
| App Runner frontend | Imagen ECR, puerto 3000, sin VPC, health `/login`, 0.25 vCPU / 0.5 GB, min 1 |
| RDS | PostgreSQL 16, `db.t4g.micro`, 20 GB gp3, cifrado, privado, `rds.force_ssl=1` |
| VPC | 2 subredes privadas (sin subredes públicas), **sin NAT Gateway** |
| ECR | 2 repositorios, escaneo al push, lifecycle de 10 imágenes |
| Secrets Manager | `club-deportivo/database-url`, `club-deportivo/jwt-secret` |
| IAM | Rol OIDC para GitHub Actions, access role de ECR e instance role de App Runner |
| Route53 | `app.<dominio>` y `api.<dominio>` (App Runner gestiona el certificado) |

> **Puerto:** App Runner no inyecta `PORT`. Como `main.ts` cae a `3000` si la variable falta, hay que definir `PORT=3001` explícitamente en `runtime_environment_variables` (o cambiar el default en código y usar 3000 en la configuración del servicio). El valor debe coincidir con `image_configuration.port`.


---

## 5. Decisiones de diseño

### 5.1 Dominios personalizados desde el día 1

`NEXT_PUBLIC_API_URL` se **incrusta en el bundle durante el build**. Usar la URL autogenerada de App Runner (`xxx.us-east-1.awsapprunner.com`) crea dependencia circular en el primer deploy y obliga a reconstruir la imagen del frontend si el servicio se recrea.

**Decisión:** dominios fijos `api.<dominio>` y `app.<dominio>` en Route53 → el build arg es determinista.

### 5.2 Migraciones al arrancar el contenedor (MVP)

`docker-entrypoint.sh`:

```sh
#!/bin/sh
set -e
npx prisma migrate deploy
exec node dist/main
```

Prisma usa un advisory lock, así que es seguro con 1–2 instancias. Implica incluir el CLI de `prisma` en la imagen de runtime (moverlo de `devDependencies` a `dependencies`).

*Alternativa enterprise:* proyecto **CodeBuild dentro de la VPC** que corre `prisma migrate deploy` antes del `start-deployment`. Más correcto, más infraestructura. Se documenta como evolución.

### 5.3 Secretos: un secreto con la URL completa

Terraform genera `random_password` y crea en Secrets Manager:

- `club-deportivo/database-url` → `postgresql://app_user:PASS@HOST:5432/club_deportivo?sslmode=require&connection_limit=5`
- `club-deportivo/jwt-secret` → string aleatorio de 48 bytes

App Runner los inyecta con `runtime_environment_secrets`, que pasa el `SecretString` completo como valor de la variable. Evita parsear el JSON del password administrado de RDS.

### 5.4 RDS

- PostgreSQL 16, `db.t4g.micro`, 20 GB gp3, cifrado en reposo, backups automáticos 7 días.
- Single-AZ para el MVP; `deletion_protection = true` en producción.
- DB subnet group en **2 AZs** (requisito de RDS aunque la instancia sea single-AZ).
- Sin acceso público; el security group solo acepta 5432 desde el SG del VPC Connector de App Runner.
- `pgcrypto` se crea en la migración baseline (`CREATE EXTENSION IF NOT EXISTS pgcrypto`); el master user de RDS es `rds_superuser` y puede crear extensiones *trusted*.
- **Sin NAT Gateway:** las tasks solo necesitan RDS. Si el backend necesita un servicio externo (email real, pasarela de pago), hay que agregar NAT (~USD 32/mes) o un VPC endpoint.

### 5.5 RLS

`esquema-final.sql` habilita RLS en 12 tablas **sin ninguna `CREATE POLICY`**. Con un rol no-dueño, todas las queries fallan. Opciones:

- **MVP (elegida):** la app conecta como dueño de las tablas → RLS queda inerte; se documenta como deuda técnica.
- **Correcto:** policies por rol de negocio (socio ve sus reservas, gerente ve todo) + rol limitado. Change OpenSpec aparte.

### 5.6 Fuente de verdad del esquema

**Decisión: `backend/db/esquema-final.sql`.** Es el único con los 18 triggers y el RLS que implementan las reglas de negocio.

Consecuencia: agregar `@@map` a los 12 modelos de Prisma (`Persona` → `personas`, `Reserva` → `reservas`, …). Los campos ya están en snake_case, así que el cambio es de 12 líneas.

### 5.7 CI/CD con OIDC

GitHub Actions asume un rol IAM vía OIDC: **cero secretos de larga vida** en GitHub. `auto_deployments_enabled = false` en App Runner para controlar el orden (migración → backend → smoke test → frontend).

---

## 6. Plan por fases

### Fase 0 — Verificación previa

- [x] Confirmar el esquema real de la BD objetivo _(verificado el 26/10/2026 contra la BD local en Docker: 12 tablas, 18 triggers, 15 funciones, 1 vista; falta contrastar con RDS antes del deploy)_:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
  SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;
  ```
- [ ] Definir dominio y comprar/hospedar zona en Route53.
- [ ] Confirmar cuenta AWS, región (`us-east-1`) y presupuesto (~USD 50/mes).
- [ ] Crear bucket S3 + tabla DynamoDB para el state de Terraform (bootstrap manual, una vez).

### Fase 1 — Unificar base de datos y migraciones (P0)

- [x] Agregar `@@map` a los 12 modelos de `backend/prisma/schema.prisma`.
- [x] Crear `backend/prisma/migrations/0001_baseline/migration.sql` con: `CREATE EXTENSION pgcrypto`, 12 tablas, 18 triggers, índices, RLS y seed de disciplinas (`ON CONFLICT DO NOTHING`).
- [x] Crear `backend/prisma/migrations/migration_lock.toml`.
- [x] Agregar scripts en `backend/package.json`: `prisma:migrate:deploy`, `db:seed`, `lint`, `typecheck`.
- [x] Mover `prisma` de `devDependencies` a `dependencies`.
- [x] Verificar `prisma migrate deploy` contra un Postgres local limpio.

> **Verificado el 26/10/2026:** baseline aplicado en `club_deportivo_migrate_test` (12 tablas de negocio, 18 triggers, 15 funciones, 1 vista); `migrate status` limpio en `club_deportivo`; `health`, `disciplines` y `login` responden contra la BD local.

### Fase 2 — Docker

- [x] `backend/Dockerfile` multi-stage (`node:22-bookworm-slim`, targets
      `deps`, `build`, `prod-deps`, `migrator` y `runtime`).
- [x] `backend/docker-entrypoint.sh` con migración opcional
      (`RUN_MIGRATIONS=true`) + arranque.
- [x] `frontend/Dockerfile` multi-stage (`node:22-alpine` en runtime).
- [x] `frontend/next.config.ts`: `output: 'standalone'` y
      `outputFileTracingRoot` apuntando a la raíz del monorepo.
- [x] `.dockerignore` en raíz, `backend/` y `frontend/`.
- [x] `docker-compose.yml` con PostgreSQL local (solo BD; ver `docs/docker.md`).
- [x] Extender `docker-compose.yml` con backend + frontend, healthchecks y
      `depends_on`.
- [x] Verificar builds desde la raíz del monorepo:
      `docker build -f backend/Dockerfile -t club-api .` y
      `docker build -f frontend/Dockerfile --build-arg NEXT_PUBLIC_API_URL=... -t club-web .`.

> **Verificado el 26/10/2026:** `docker compose up -d --build` deja los tres
> servicios arriba; `GET /api/v1/health` responde `db: "up"` desde el
> contenedor, el login devuelve JWT, `localhost:3000/login` renderiza el
> frontend y el preflight CORS responde 204. El target `migrator` ejecuta
> `prisma migrate deploy` sin migraciones pendientes.

### Fase 3 — Hardening de runtime

- [x] `app.enableShutdownHooks()` en `backend/src/main.ts`.
- [x] Health check con `SELECT 1` real (readiness para App Runner):
      `GET /api/v1/health` responde `db: "up"` o `503` si la base no responde.
- [x] Fail-fast si falta `JWT_SECRET` con `NODE_ENV=production`
      (también exige `DATABASE_URL`).
- [x] `helmet`, compresión y logs JSON a stdout (`JsonLogger` en producción).
- [x] `connection_limit` en `DATABASE_URL` según número de instancias
      (variable `DB_CONNECTION_LIMIT`, aplicada por `PrismaService`).
- [x] Revisar `SuspendedUserGuard` y el endpoint de cancelación:
      se eliminó el import sin uso (lo cubre `ActiveUserGuard`) y se agregó
      `PATCH /reservations/:id` para la cancelación autoservicio del socio.

> **Verificado el 26/10/2026:** health con DB real, headers de Helmet, login,
> `PATCH /reservations/:id` (401 sin token, 404 con UUID inexistente, 400 con
> estado distinto de `CANCELADA`), arranque abortado sin `JWT_SECRET` en
> producción y logs 100 % JSON. Tests: 37/37.

### Fase 4 — Terraform

- [x] `infra/terraform/versions.tf`, `providers.tf`, `backend.tf` (state en S3 + lock DynamoDB).
- [x] `variables.tf` + `terraform.tfvars.example`.
- [x] `network.tf`: VPC, 2 subredes privadas, route table, security groups (sin NAT).
- [x] `rds.tf`: subnet group, parameter group (`rds.force_ssl=1`), instancia.
- [x] `secrets.tf`: `random_password`, secretos en Secrets Manager.
- [x] `ecr.tf`: 2 repositorios, escaneo, lifecycle policy.
- [x] `iam.tf`: rol OIDC de GitHub, access role e instance role de App Runner.
- [x] `apprunner.tf`: VPC Connector, 2 servicios, autoscaling, health checks, secretos.
- [x] `dns.tf`: registros de validación y CNAME en Route53.
- [x] `observability.tf`: alarmas (5xx, CPU, health check) + SNS. App Runner gestiona
      sus log groups, así que no se declaran en Terraform.
- [x] `outputs.tf`: URLs de ECR, URLs de servicio, endpoint de RDS y rol de GitHub.
- [x] `bootstrap-state.sh` para bucket S3 + tabla DynamoDB.

> **Verificado el 26/10/2026:** `terraform fmt -check -recursive` y
> `terraform validate` OK con Terraform 1.9.8 (Docker). **No aplicado**: falta
> cuenta AWS, state remoto y dominio. Ver `docs/despliegue-aws.md`.

### Fase 5 — CI/CD

- [x] Reescribir `.github/workflows/ci.yml`: `lint` + `typecheck` + `jest` +
      `openspec validate --all --strict` + `docker build` (sin push en PR).
- [x] `.github/workflows/docker-build-push.yml`: buildx `linux/amd64` → ECR,
      tags por SHA y `latest`, OIDC.
- [x] `.github/workflows/deploy-aws.yml`: `start-deployment` backend → esperar
      `SUCCEEDED` → smoke test → `start-deployment` frontend → verificar `/login`.
- [x] Gate por `AWS_DEPLOY_ENABLED` + `AWS_ROLE_ARN` + `AWS_REGION`.
- [x] `scripts/smoke-test.sh` (health, disciplinas y login opcional).
- [x] `ci.yml` valida con actionlint; smoke test probado contra el backend local.

> **Pendiente:** el primer run real de los workflows contra AWS.

### Fase 6 — Documentación y OpenSpec

- [x] `docs/despliegue-aws.md`: runbook (deploy, rollback, migraciones, backups, troubleshooting).
- [x] Change OpenSpec `despliegue-aws` (`proposal.md`, `design.md`, `tasks.md`, `specs/`).
- [x] Marcar `render.yaml` y `docs/despliegue.md` como obsoletos para AWS.
- [x] Actualizar `AGENTS.md` y `README.md` (workflows, estado de fases, Docker/AWS).
- [x] `frontend/.env.example` y `.gitignore` de Terraform.

---

## 7. Archivos a crear / modificar

### Crear

| Archivo | Propósito |
|---|---|
| `backend/Dockerfile` | Imagen multi-stage NestJS + Prisma |
| `backend/docker-entrypoint.sh` | `migrate deploy` + arranque |
| `backend/.dockerignore` | Excluir `node_modules`, `dist`, `.env*`, `*.tsbuildinfo` |
| `frontend/Dockerfile` | Imagen multi-stage Next.js standalone |
| `frontend/.dockerignore` | Excluir `node_modules`, `.next`, `.env*` |
| `.dockerignore` | Contexto raíz del monorepo |
| `backend/prisma/migrations/0001_baseline/migration.sql` | Baseline con triggers, RLS y seed |
| `backend/prisma/migrations/migration_lock.toml` | Lock de Prisma |
| `backend/prisma/seed.ts` (o seed dentro de la baseline) | Datos mínimos |
| `infra/terraform/*.tf` | Infraestructura completa |
| `.github/workflows/ci.yml` (reescritura) | CI real |
| `.github/workflows/docker-build-push.yml` | Build + push a ECR |
| `.github/workflows/deploy-aws.yml` | Deploy a App Runner |
| `docs/despliegue-aws.md` | Runbook |
| `openspec/changes/despliegue-aws/*` | Change OpenSpec |
| `frontend/.env.example` | Documentar `NEXT_PUBLIC_API_URL` |

### Modificar

| Archivo | Cambio |
|---|---|
| `backend/prisma/schema.prisma` | `@@map` en los 12 modelos |
| `backend/src/main.ts` | `enableShutdownHooks()`, fail-fast de JWT, logs |
| `backend/src/health/health.controller.ts` | Health con `SELECT 1` |
| `backend/src/prisma/prisma.service.ts` | Fail-fast en producción en vez de "modo offline" |
| `backend/package.json` | Scripts `lint`/`typecheck`/`migrate:deploy`, `engines.node`, `prisma` en dependencies |
| `frontend/next.config.ts` | `output: 'standalone'` |
| `frontend/package.json` | `typecheck`, `engines.node` |
| `package.json` (raíz) | `packageManager`, `engines` |
| `docker-compose.yml` | Agregar servicios backend + frontend (hoy solo `db`) |
| `.gitignore` | Ignorar `.env.production`, `*.tsbuildinfo` |
| `render.yaml` | Marcar obsoleto |
| `AGENTS.md`, `README.md` | Corregir estado real del repo |

---

## 8. Detalle de las imágenes Docker

### 8.1 Backend

Base `node:22-bookworm-slim` (no Alpine: los engines de Prisma necesitan OpenSSL/glibc).

```
Etapa deps     → corepack enable + pnpm install --frozen-lockfile --prod=false (contexto raíz)
Etapa build    → prisma generate + nest build; conserva prisma/ (schema + migrations)
Etapa runtime  → pnpm install --prod --frozen-lockfile + CLI de prisma
                 usuario no-root, EXPOSE 3001
                 HEALTHCHECK → /api/v1/health
                 ENTRYPOINT docker-entrypoint.sh
```

Consideraciones:

- Si se construye en Mac ARM: `docker buildx --platform linux/amd64` (App Runner es x86_64) y `binaryTargets = ["native", "linux-openssl-3.0.x"]` en `schema.prisma`.
- `dotenv` busca `backend/.env`; en el contenedor las variables se inyectan por entorno (el `.env` no se hornea).
- `backend/tsconfig.tsbuildinfo` está trackeado en git: excluirlo del contexto de build.

### 8.2 Frontend

Contexto de build: `frontend/` (usa su propio lockfile y workspace).

```
Etapa deps     → pnpm install --frozen-lockfile
Etapa build    → ARG NEXT_PUBLIC_API_URL → ENV → pnpm build
Etapa runtime  → node:22-alpine
                 copia .next/standalone, .next/static, public
                 HOSTNAME=0.0.0.0 PORT=3000 CMD ["node","server.js"]
```

Consideraciones:

- El build necesita red por `next/font/google`.
- `NEXT_PUBLIC_API_URL` debe incluir `/api/v1`.
- `proxy.ts` requiere servidor Node: no se puede exportar estático.

---

## 9. Flujo CI/CD

```
PR          → ci.yml
              lint + typecheck + jest + openspec validate --all --strict
              + docker build (backend y frontend, sin push) + compose config

merge main  → docker-build-push.yml (si AWS_DEPLOY_ENABLED=true)
              buildx linux/amd64 → ECR (tags = SHA del commit y latest)

            → deploy-aws.yml
              1. start-deployment backend → esperar SUCCEEDED (migra al arrancar)
              2. smoke test /api/v1/health, /api/v1/disciplines y login opcional
              3. start-deployment frontend → esperar SUCCEEDED
              4. verificar https://<web>/login
```

Permisos del rol OIDC: login y push a los 2 repos de ECR,
`apprunner:ListServices`, `DescribeService`, `ListOperations` y `StartDeployment`.
No usa `logs:*` porque los logs se consultan desde la consola/CLI con las
credenciales del operador.

---

## 10. Costo estimado (us-east-1, 24/7)

| Recurso | USD/mes |
|---|---|
| App Runner backend (0.25 vCPU / 0.5 GB, min 1) | ~14 |
| App Runner frontend (0.25 vCPU / 0.5 GB, min 1) | ~14 |
| RDS `db.t4g.micro` + 20 GB gp3 + backups | ~17 |
| Secrets Manager (2), ECR, CloudWatch, Route53 | ~4 |
| **Total** | **~49** |

Sin NAT Gateway. Agregarlo suma ~USD 32/mes. Se puede reducir a ~30 con `min_size = 0` en el frontend (cold start de ~10 s) y apagando RDS fuera de horario.

---

## 11. Riesgos

| # | Riesgo | Mitigación |
|---|---|---|
| 1 | Esquema divergente → la app no arranca o no aplica reglas de negocio | Fase 0 y 1 antes de cualquier Dockerfile |
| 2 | Migración en el entrypoint con cambio destructivo tumba todas las instancias | Migraciones solo aditivas + backup automático previo |
| 3 | `NEXT_PUBLIC_API_URL` inmutable | Dominios fijos; rebuild si cambia |
| 4 | Sin NAT, integraciones externas fallan | Documentar; agregar NAT cuando se necesite |
| 5 | RLS inerte sin policies | Deuda documentada; change OpenSpec posterior |
| 6 | App Runner no tiene jobs one-off | Migración al arranque o CodeBuild en VPC |
| 7 | CI actual no ejecuta nada | Reescribir antes de confiar en gates de merge |
| 8 | Cold start si `min_size = 0` | Mantener min 1 en backend |

---

## 12. Checklist de verificación post-deploy

- [ ] `GET https://api.<dominio>/api/v1/health` → `200 { status: 'ok' }`
- [ ] `GET https://api.<dominio>/api/v1/disciplines` → datos reales (confirma conexión a RDS)
- [ ] `POST /api/v1/auth/register` y `POST /api/v1/auth/login` funcionan
- [ ] `GET https://app.<dominio>/` carga y muestra disciplinas (confirma `NEXT_PUBLIC_API_URL` y CORS)
- [ ] Login desde el frontend y navegación por rol
- [ ] Crear reserva → verificar que el trigger aplica el límite de 2
- [ ] Alquilar equipamiento → verificar decremento de stock
- [ ] Logs visibles en CloudWatch para ambos servicios
- [ ] Alarmas configuradas y notificando
- [ ] Backup de RDS verificado (snapshot manual + restauración documentada)

---

## 13. Referencias

- `backend/db/esquema-final.sql` — esquema autoritativo con triggers y RLS
- `backend/prisma/schema.prisma` — modelos Prisma
- `backend/.env.example` — variables de entorno del backend
- `docs/docker.md` — PostgreSQL local en Docker (estado y tareas)
- `docs/despliegue-aws.md` — runbook del despliegue objetivo (Terraform/AWS)
- `docs/despliegue.md` — guía histórica del despliegue Render + Vercel + Supabase
- `render.yaml` — blueprint histórico marcado como obsoleto
- `openspec/changes/despliegue-backend/` — change previa (Docker era non-goal)
- `openspec/changes/despliegue-aws/` — change de infraestructura AWS
- `openspec/changes/club-deportivo-reservas/tasks.md` — estado de fases
- `.github/workflows/ci.yml` — CI real
- `.github/workflows/docker-build-push.yml` — build y push a ECR
- `.github/workflows/deploy-aws.yml` — deploy en App Runner

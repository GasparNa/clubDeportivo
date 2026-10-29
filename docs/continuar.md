# 📄 Resumen del Proyecto — Club Deportivo (Sistema de Reservas)

> Archivo para retomar el trabajo. Contiene el estado actual del repositorio, las decisiones de despliegue ya tomadas y las tareas pendientes priorizadas.
>
> **Última actualización:** 26/10/2026 · **Rama:** `main` @ `869952c`

---

## 1. Proyecto

**Nombre:** Sistema de Reservas — Club Deportivo
**Propósito:** MVP de reservas de canchas por disciplina (Tenis, Fútbol, Pádel), con franjas horarias, alquiler de equipamiento con control de stock, pagos, auditoría y notificaciones.
**Idioma oficial:** Español (es-AR) para dominio, tablas, columnas y comentarios.
**Enfoque:** API-First — los contratos se definen en OpenSpec antes del código.
**Estado:** Backend y frontend funcionales. **No está listo para desplegar**: no hay artefactos Docker, el CI no ejecuta nada y conviven dos esquemas de base de datos incompatibles.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión / notas |
|---|---|---|
| Backend | NestJS | 12.x, TypeScript 6 |
| ORM | Prisma | 5.22.0 |
| Base de datos | PostgreSQL | 14+ (Supabase hoy; RDS en el plan AWS) |
| Frontend | Next.js | 16.3.8 (App Router) |
| UI | React 19.2.8 + Tailwind CSS v4 | |
| Datos cliente | TanStack Query 5 | |
| Formularios | react-hook-form + zod | |
| Autenticación | JWT propio (NestJS + passport-jwt) | bcryptjs para hashes |
| Especificaciones | OpenSpec | `@fission-ai/openspec` 1.12 |
| CI/CD | GitHub Actions | workflow actual incompleto |
| Despliegue actual | Render (API) + Vercel (web) + Supabase (BD) | a reemplazar por AWS |
| Despliegue objetivo | **AWS App Runner + RDS + ECR + Terraform** | Docker en ambos servicios |

---

## 3. Estructura de directorios

```
club-deportivo/
├── backend/
│   ├── src/
│   │   ├── main.ts                 # bootstrap, CORS, ValidationPipe, puerto
│   │   ├── app.module.ts
│   │   ├── auth/                   # JWT strategy, RolesGuard, ActiveUserGuard, SuspendedUserGuard
│   │   ├── prisma/                 # PrismaService (@Global)
│   │   ├── health/                 # GET /api/v1/health
│   │   ├── usuarios/               # registro, login, perfil, solicitudes, usuarios
│   │   ├── instalaciones/          # disciplinas, canchas, franjas, disponibilidad
│   │   ├── reservas/               # reservas, equipamiento, alquileres
│   │   └── pagos/                  # pagos, auditoría, notificaciones
│   ├── prisma/
│   │   └── schema.prisma           # 12 modelos (SIN @@map todavía)
│   ├── db/
│   │   ├── esquema-final.sql       # ⭐ fuente de verdad: 12 tablas, 18 triggers, RLS
│   │   ├── migrations/001_*.sql    # ya consolidada en esquema-final.sql (no-op)
│   │   └── schema.sql, esquemaUltimo.sql, ...  # versiones históricas (ignorar)
│   ├── stubs/                      # mocks para Jest
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/app/                    # ~28 pantallas (público, socio, gerente, admin)
│   ├── src/lib/                    # http-client, auth, types, api-mappers
│   ├── src/proxy.ts                # middleware de Next 16 (auth + roles)
│   ├── next.config.ts              # SIN output: 'standalone'
│   └── package.json
├── openspec/
│   ├── changes/                    # changes activas y archivadas
│   └── specs/                      # vacío (.gitkeep)
├── docs/                           # resumen.md, despliegue.md, modelo-datos.md, ...
├── .github/workflows/ci.yml        # ⚠️ incompleto (sin jobs)
├── render.yaml                     # blueprint actual (a reemplazar)
├── docker-compose.yml              # ❌ no existe
├── pnpm-workspace.yaml
└── AGENTS.md
```

---

## 4. Modelo de datos

### 4.1 Las dos fuentes de verdad (problema central)

| Archivo | Formato | Contenido |
|---|---|---|
| `backend/prisma/schema.prisma` | PascalCase, **sin `@@map`** | 12 modelos, sin triggers |
| `backend/db/esquema-final.sql` | snake_case plural | 12 tablas, 19 índices, 30 constraints, **15 funciones, 18 triggers**, 1 vista, RLS, seed |
| `docs/migracion-inicial.sql` | PascalCase | salida de Prisma, sin triggers |
| `backend/db/schema.sql` y otros | v1/v2 | obsoletos, no usar |

**Decisión tomada:** `esquema-final.sql` es la fuente de verdad. Prisma necesita **12 líneas `@@map`** y ningún `@map` de campo (las columnas ya coinciden al 100%).

### 4.2 Tablas (12)

`personas`, `contactos_persona`, `direcciones_persona`, `usuarios`, `solicitudes_permiso`, `registros_auditoria`, `disciplinas`, `canchas`, `franjas_horarias`, `equipamientos`, `reservas`, `detalle_alquiler_equipamiento`.

Vista: `v_reservas_detalle` (no modelada en Prisma).

### 4.3 Reglas de negocio en triggers

- Máximo **2 reservas `CONFIRMADA`** por usuario (con `pg_advisory_xact_lock`).
- Cancelación con **1 día de anticipación** para reservas `AUTOGESTIONADA`.
- **Stock de equipamiento**: se decrementa al insertar el detalle y se restaura al devolver o cancelar.
- **3 infracciones** de equipamiento → suspensión automática.
- `registros_auditoria` es **append-only** (`REVOKE UPDATE, DELETE`).
- Al pasar una cancha a `MANTENIMIENTO` se cancelan reservas futuras y se libera stock.
- `fn_marcar_no_devueltos()` requiere un scheduler que **no existe** en el repo.

### 4.4 RLS

Habilitado en las **12 tablas**, con **cero `CREATE POLICY`**. Si el rol de la app no es dueño de las tablas, todo devuelve 0 filas sin error.

---

## 5. Autenticación y roles

- JWT propio: `POST /api/v1/auth/register` y `POST /api/v1/auth/login`.
- Token en `localStorage` + cookie `SameSite=Lax` para el middleware del frontend.
- `JwtStrategy` valida que el usuario exista y no esté `SUSPENDIDO`.
- Roles: `SOCIO`, `GERENTE`, `ADMINISTRADOR` (`RolesGuard` + `@Roles`).
- `ActiveUserGuard` se aplica en `POST /reservations` y `POST /equipment-rentals`.
- `SuspendedUserGuard` está definido e importado pero **no se usa**.
- Registro crea el usuario en estado `PENDIENTE`; solo un ADMINISTRADOR lo activa.

---

## 6. API y servicios

Todos los endpoints cuelgan de `/api/v1` (declarado en cada `@Controller`).

| Módulo | Endpoints principales |
|---|---|
| Health | `GET /health` |
| Auth/Usuarios | `POST /auth/register`, `POST /auth/login`, `GET/PUT /profile`, `GET /users`, `PATCH /users/:id/status`, `GET/PATCH /permission-requests` |
| Instalaciones | CRUD `/disciplines`, `/courts`, `/time-slots`, `GET /time-slots/availability` |
| Reservas | `GET/POST /reservations`, `PATCH /reservations/:id/status`, `GET /equipment`, `GET/POST /equipment-rentals`, `PATCH /equipment-rentals/:id/return` |
| Pagos | `POST /payments`, `GET /payments`, `GET /audit-logs`, `GET /audit-logs/report`, `POST /notifications` |

**Faltante funcional:** el frontend llama `PATCH /reservations/:id` (`frontend/src/app/my-reservations/page.tsx:49`) pero el backend solo expone `PATCH /reservations/:id/status` con rol GERENTE/ADMIN. No hay `DELETE /reservations/:id` aunque `cancelarReservaAutogestionada()` ya existe en el servicio.

---

## 7. Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Conexión PostgreSQL (Prisma) | Sí |
| `JWT_SECRET` | Secreto de firma (hoy tiene fallback inseguro) | Sí en producción |
| `JWT_EXPIRATION` | Ej. `24h` | No |
| `PORT` | `main.ts` cae a `3000` si falta; `.env.example` usa `3001` | No |
| `NODE_ENV` | `production` en deploy | No |
| `CORS_ORIGINS` | Lista separada por comas | Sí en producción |

### Frontend

| Variable | Descripción | Obligatoria |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | URL del API **incluyendo `/api/v1`**. Se incrusta en build | Sí |

### Docker local (nuevo)

`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `DATABASE_URL`.

> No hay `.env` versionado. `.gitignore` raíz solo ignora `.env`, `.env.local` y `.env*.local`.

---

## 8. Comandos

```bash
# Instalación (raíz, ejecuta prisma skills sync)
pnpm install

# Backend
cd backend && pnpm run start:dev
cd backend && pnpm run build          # también hace de typecheck
cd backend && pnpm run test           # Jest, sin BD
cd backend && pnpm prisma generate    # obligatorio tras cambiar el schema

# Frontend
cd frontend && pnpm dev
cd frontend && pnpm build
cd frontend && pnpm lint

# OpenSpec
npx openspec validate --strict
```

**No existen** `pnpm run lint`, `pnpm run typecheck` ni `pnpm run test:e2e` funcionales en el backend (`test:e2e` apunta a `backend/test/jest-e2e.json`, que no existe).

---

## 9. Estado del despliegue

### 9.1 Actual (a reemplazar)

- Backend en **Render** (`render.yaml`: plan free, Oregon, health `/api/v1/health`).
- Frontend en **Vercel** (Root Directory `frontend`, Node 22).
- BD en **Supabase** (session pooler :5432).
- Guía: `docs/despliegue.md`.

### 9.2 Objetivo (decidido)

| Componente | Decisión |
|---|---|
| Cómputo | **AWS App Runner** (backend y frontend como contenedores) |
| Base de datos | **RDS PostgreSQL 16** (`db.t4g.micro`, privado, `sslmode=require`) |
| Frontend | **Contenedor en AWS**, no Vercel |
| Infraestructura | **Terraform** (`infra/terraform/`) |
| Registro de imágenes | ECR (2 repos) |
| Secretos | Secrets Manager |
| CI/CD | GitHub Actions con **OIDC** (sin access keys) |
| Migraciones | `prisma migrate deploy` en el entrypoint del contenedor |
| Dominios | `api.<dominio>` y `app.<dominio>` en Route53 (build arg determinista) |

Costo estimado: **~USD 49/mes** sin NAT Gateway.

### 9.3 Estado real de los artefactos

| Artefacto | Estado |
|---|---|
| `Dockerfile` (backend/frontend) | ❌ no existe |
| `.dockerignore` | ❌ no existe |
| `docker-compose.yml` | ❌ no existe |
| `backend/prisma/migrations/` | ❌ no existe |
| `infra/terraform/` | ❌ no existe |
| `.github/workflows/ci.yml` | ⚠️ 6 líneas, **sin `jobs:`** |
| `render.yaml` | ✅ existe (obsoleto tras migrar a AWS) |
| `docs/despliegue.md` | ✅ existe (Render/Vercel/Supabase) |
| `docs/resumen.md` | ✅ existe (plan AWS completo) |

---

## 10. Decisiones ya tomadas

1. **Fuente de verdad del esquema:** `backend/db/esquema-final.sql` (snake_case + triggers + RLS).
2. **Prisma:** agregar `@@map` a los 12 modelos. Nunca `prisma migrate dev` ni `db push` contra esta BD.
3. **Base de datos en Docker:** baseline de Prisma + `migrate deploy`, no scripts de initdb.
4. **Roles:** un solo rol dueño (`club_app`) en el MVP; RLS inerte y documentado como deuda.
5. **Seed:** admin activo + 6 canchas + franjas + equipamiento.
6. **Bug de stock:** se corrige en la misma tarea (quitar los `update` de la app, dejar los triggers).
7. **AWS:** App Runner + RDS + frontend en contenedor + Terraform.

---

## 11. Gotchas importantes

1. **No usar `prisma migrate dev` ni `prisma db push`**: destruirían los índices parciales, triggers y CHECKs del esquema SQL.
2. **`prisma generate` es obligatorio** antes de `nest build` (el cliente no está en el repo).
3. **`dia_semana` usa `EXTRACT(DOW)`**: 0 = domingo … 6 = sábado. No es ISO.
4. **RLS sin policies**: un rol no-dueño ve 0 filas sin error.
5. **Doble decremento de stock** si se activan los triggers sin corregir la app.
6. **`NEXT_PUBLIC_API_URL` se incrusta en build**: cambiarla exige rebuild, no restart.
7. **`next/font/google`** requiere red durante el build del frontend.
8. **Dos lockfiles/workspaces** (raíz y `frontend/`): el build de Docker debe elegir contexto.
9. **`backend/tsconfig.tsbuildinfo` está trackeado en git**: excluirlo del contexto Docker.
10. **La BD de producción probablemente es PascalCase sin triggers** (`docs/despliegue.md:69` consulta `"Disciplina"`). No copiar datos sin migrarlos.
11. **`main.ts` no llama `enableShutdownHooks()`**: en App Runner/ECS no se hace `$disconnect` de Prisma al recibir `SIGTERM`.
12. **JWT con fallback `default-secret-change-me`** si falta `JWT_SECRET`.

---

## 12. Tareas a completar

### Fase 0 — Verificación previa (bloqueante)

- [ ] Confirmar el esquema real de la BD objetivo:
  ```sql
  SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1;
  SELECT tgname FROM pg_trigger WHERE NOT tgisinternal;
  ```
- [ ] Definir dominio y zona en Route53.
- [ ] Confirmar cuenta AWS, región (`us-east-1`) y presupuesto (~USD 50/mes).
- [ ] Crear bucket S3 + tabla DynamoDB para el state de Terraform.

### Fase 1 — PostgreSQL en Docker (siguiente paso inmediato)

- [ ] Agregar los **12 `@@map`** en `backend/prisma/schema.prisma` (líneas 31, 50, 74, 94, 112, 131, 144, 162, 179, 197, 220, 241).
- [ ] Ejecutar `pnpm prisma generate`.
- [ ] Crear `backend/prisma/migrations/0001_baseline/migration.sql` (copia de `esquema-final.sql` + cabecera).
- [ ] Crear `backend/prisma/migrations/migration_lock.toml` (`provider = "postgresql"`).
- [ ] Crear `scripts/db-baseline.sh` (regenera el baseline desde `esquema-final.sql`).
- [ ] Crear `docker-compose.yml` con `db` (`postgres:16-alpine`), `migrate` y `seed` (perfiles `tools`).
- [ ] Crear `backend/db/seed/bootstrap.sql`:
  - [ ] 1 persona admin + contacto EMAIL activo + usuario `ADMINISTRADOR`/`ACTIVO` con hash bcrypt.
  - [ ] 6 canchas (2 por disciplina).
  - [ ] Franjas horarias (7 días × 3 por cancha, `dia_semana` en `EXTRACT(DOW)`).
  - [ ] Equipamiento (2 por disciplina).
- [ ] Crear `scripts/db-up.sh`, `scripts/db-reset.sh`.
- [ ] Agregar scripts en `backend/package.json`: `db:up`, `db:reset`, `db:seed`, `db:baseline`, `prisma:migrate:deploy`.
- [ ] Actualizar `backend/.env.example` y `.gitignore`.
- [ ] **Corregir el doble stock** en `backend/src/reservas/reservas.service.ts`:
  - [ ] Eliminar el `decrement` de stock (líneas 402-409).
  - [ ] Eliminar el `increment` de stock (líneas 471-477).
  - [ ] Enviar `fecha_devolucion_estimada: null` (líneas 416-438) para que lo calcule el trigger.
- [ ] Verificar: 12 tablas, 1 vista, 18 triggers, 15 funciones, 3 disciplinas.
- [ ] Verificar triggers: 3ª reserva rechazada, reserva duplicada rechazada, stock baja exactamente 1 y vuelve, auditoría append-only.
- [ ] Arrancar el backend contra el contenedor y probar login + `/disciplines`.

**Criterio de aceptación:** `docker compose down -v && ./scripts/db-up.sh` deja una BD usable desde cero, y los 13 checks de verificación pasan.

### Fase 2 — Dockerfiles de aplicación

- [ ] `backend/Dockerfile` multi-stage (`node:22-bookworm-slim`, targets `runtime` y `migrator`).
- [ ] `backend/docker-entrypoint.sh` (`prisma migrate deploy` + `node dist/main`).
- [ ] `frontend/Dockerfile` multi-stage (`node:22-alpine` en runtime).
- [ ] `frontend/next.config.ts`: `output: 'standalone'`.
- [ ] `.dockerignore` en raíz, `backend/` y `frontend/`.
- [ ] `docker-compose.yml`: agregar servicios `backend` y `frontend`.
- [ ] Verificar builds locales y `linux/amd64` (App Runner es x86_64).
- [ ] `binaryTargets = ["native", "linux-openssl-3.0.x"]` si se construye en Mac ARM.

### Fase 3 — Hardening del backend

- [ ] `app.enableShutdownHooks()` en `backend/src/main.ts`.
- [ ] Health check con `SELECT 1` real.
- [ ] Fail-fast si falta `JWT_SECRET` con `NODE_ENV=production`.
- [ ] `helmet`, compresión y logs JSON a stdout.
- [ ] `connection_limit` en `DATABASE_URL`.
- [ ] Revisar `SuspendedUserGuard` (definido pero sin usar).

### Fase 4 — Terraform

- [ ] `infra/terraform/{versions,providers,backend,variables,network,rds,secrets,ecr,iam,apprunner,dns,observability,outputs}.tf`.
- [ ] VPC: 2 subnets públicas + 2 privadas, sin NAT.
- [ ] RDS PostgreSQL 16, `db.t4g.micro`, `rds.force_ssl=1`, sin acceso público.
- [ ] Secrets Manager: `club-deportivo/database-url` y `club-deportivo/jwt-secret`.
- [ ] ECR: 2 repositorios con escaneo y lifecycle.
- [ ] App Runner: VPC Connector + 2 servicios + autoscaling + health checks.
- [ ] IAM: rol OIDC para GitHub, rol de instancia para ECR.
- [ ] Route53 + dominios personalizados.
- [ ] CloudWatch Logs + alarmas.

### Fase 5 — CI/CD

- [ ] Reescribir `.github/workflows/ci.yml`: lint + `nest build` + jest + `openspec validate --strict` + `docker build`.
- [ ] `.github/workflows/docker-build-push.yml`: buildx `linux/amd64` → ECR (tag = SHA), OIDC.
- [ ] `.github/workflows/deploy-aws.yml`: migración → backend → smoke test → frontend.
- [ ] `diff` en CI entre `esquema-final.sql` y `0001_baseline/migration.sql`.

### Fase 6 — Funcional pendiente

- [ ] Exponer `DELETE /reservations/:id` o corregir el frontend (`my-reservations/page.tsx:49`) para usar `PATCH /reservations/:id/status`.
- [ ] Aplicar `SuspendedUserGuard` en las rutas correspondientes.
- [ ] Crear `backend/test/jest-e2e.json` o eliminar el script `test:e2e`.
- [ ] Agregar `lint` y `typecheck` reales al backend.
- [ ] Completar tarea 2.5 de `tasks.md` (instalaciones).
- [ ] Completar tareas 3.11–3.15 (cancelación autogestionada) y marcar `cancelacion-autogestionada`.
- [ ] Scheduler para `fn_marcar_no_devueltos()` (`pg_cron` o `@nestjs/schedule`).

### Fase 7 — Documentación y OpenSpec

- [ ] `docs/despliegue-aws.md` (runbook: deploy, rollback, migraciones, backups).
- [ ] `docs/bbdd-docker.md` (levantar, resetear, conectarse, troubleshooting).
- [ ] Change OpenSpec `despliegue-aws` (`proposal.md`, `design.md`, `tasks.md`, `specs/`).
- [ ] Marcar `render.yaml` como obsoleto o eliminarlo.
- [ ] Actualizar `AGENTS.md` (workflows inexistentes, `scripts/` inexistente, backend/frontend desactualizados).
- [ ] Actualizar `README.md` (CI sigue pendiente).
- [ ] Poblar `openspec/specs/` con los contratos consolidados.
- [ ] Corregir `docs/modelo-datos.md` (apunta a `schema.sql` v1, menciona `no_socios` y XOR inexistentes).

---

## 13. Criterios de aceptación globales

| # | Criterio |
|---|---|
| 1 | `docker compose down -v && ./scripts/db-up.sh` crea la BD completa desde cero |
| 2 | `prisma migrate status` → "Database schema is up to date!" |
| 3 | El backend arranca contra el contenedor y `GET /api/v1/disciplines` devuelve 3 registros |
| 4 | Los triggers de reservas y stock funcionan (sin doble decremento) |
| 5 | `docker build` de ambas imágenes produce artefactos `linux/amd64` |
| 6 | `terraform plan` sin errores y `apply` crea toda la infraestructura |
| 7 | Un push a `main` construye, publica en ECR y despliega en App Runner |
| 8 | `GET https://api.<dominio>/api/v1/health` y `https://app.<dominio>/` responden |
| 9 | Login, crear reserva y alquilar equipamiento funcionan end-to-end |
| 10 | `npx openspec validate --strict` pasa en CI |

---

## 14. Cómo retomar

1. Leer este archivo y `docs/resumen.md`.
2. Empezar por la **Fase 1** (PostgreSQL en Docker): es el bloqueante de todo lo demás.
3. Antes de escribir el baseline, confirmar la Fase 0 (esquema real de la BD y dominio).
4. No avanzar a la Fase 2 (Dockerfiles) hasta que los 13 checks de la Fase 1 pasen.

**Comandos para retomar la Fase 1:**

```bash
# 1. Ver el estado
git status
cat docs/continuar.md

# 2. Editar schema.prisma (12 @@map) y generar el cliente
cd backend && pnpm prisma generate && cd ..

# 3. Generar baseline y levantar
./scripts/db-baseline.sh
./scripts/db-up.sh

# 4. Verificar
docker compose exec db psql -U club_app -d club_deportivo -c "\dt"
```

---

## 15. Referencias

| Documento | Contenido |
|---|---|
| `docs/resumen.md` | Plan completo de despliegue Docker en AWS (461 líneas) |
| `AGENTS.md` | Convenciones del proyecto y flujo Git (parcialmente desactualizado) |
| `docs/despliegue.md` | Guía del despliegue actual (Render + Vercel + Supabase) |
| `docs/modelo-datos.md` | Modelo de datos (desactualizado: apunta a `schema.sql` v1) |
| `backend/db/esquema-final.sql` | Esquema autoritativo con triggers y RLS |
| `backend/db/Auditoria.md` | Evolución del esquema (contiene afirmaciones incorrectas sobre idempotencia) |
| `openspec/changes/club-deportivo-reservas/tasks.md` | Estado de fases del MVP |
| `render.yaml` | Blueprint vigente a reemplazar |

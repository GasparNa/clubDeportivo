# Docker — PostgreSQL local

> **Estado:** 🟢 Base local operativa y Prisma alineado (B0–B3 completados).
> **Última actualización:** 2026-10-26
> **Plan detallado:** [`docs/plan-postgres-docker.md`](./plan-postgres-docker.md)
> **Planificación de ejecución (orden y tiempos):** [`docs/plan-ejecucion-docker.md`](./plan-ejecucion-docker.md)
> **Contexto general:** [`docs/continuar.md`](./continuar.md)

---

## 1. Resumen ejecutivo

Levantar una base PostgreSQL local y reproducible en Docker con el esquema
autoritativo del proyecto (`backend/db/esquema-final.sql`), datos mínimos de
desarrollo y conexión desde NestJS/Prisma vía `DATABASE_URL`.

El objetivo es que este comando deje una base usable desde cero:

```bash
./scripts/db-reset.sh
```

y que el backend pueda arrancar contra el contenedor sin depender de Supabase.

### Decisiones tomadas

| Tema | Decisión |
|---|---|
| Imagen | `postgres:16-alpine` (cumple 14+, incluye `pgcrypto`) |
| Base / usuario | `club_deportivo` / `club_deportivo` |
| Puerto host | **5433** → 5432 (evita choque con un Postgres local) |
| Persistencia | Volumen nombrado `pgdata` |
| Bootstrap | `prisma migrate deploy` (única vía de crear el esquema) |
| Seed | Archivo aparte e idempotente (`backend/db/seed/20-seed.sql`) |
| Prisma | 12 `@@map` + baseline `0001_baseline` |
| Entorno | `.env` en raíz (compose) y `backend/.env` (app), ambos ignorados |

> Supuestos ajustables: si se prefiere el puerto 5432 o Postgres 14, cambian
> solo dos líneas del compose.

---

## 2. Estado actual

| Elemento | Estado |
|---|---|
| `docker-compose.yml` | ✅ Creado (`postgres:16-alpine`, puerto 5433) |
| `Dockerfile` / `.dockerignore` | ✅ `backend/Dockerfile` y `frontend/Dockerfile` (targets `runtime` y `migrator`) |
| `backend/db/esquema-final.sql` | ✅ Existe (1965 líneas, DDL autoritativo) |
| Seed de desarrollo | ✅ `backend/db/seed/20-seed.sql` |
| Migraciones Prisma | ✅ `0001_baseline` + `migration_lock.toml` |
| `backend/.env` | ✅ Creado con la URL local |
| Cliente `psql` en el host | ❌ No instalado → usar `docker compose exec` |
| Scripts `scripts/db-*.sh` | ✅ Creados y probados |
| `@@map` en `schema.prisma` | ✅ Los 12 modelos mapeados |

### Lo que ya está resuelto en el esquema

`backend/db/esquema-final.sql` crea:

- `CREATE EXTENSION pgcrypto`
- 12 tablas, 1 vista (`v_reservas_detalle`)
- 15 funciones y 18 triggers
- RLS habilitado en 12 tablas (sin policies)
- `REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC`
- 3 disciplinas (Fútbol, Tenis, Pádel)

**No** crea la base, el rol, policies ni un seed de desarrollo. Tampoco es
idempotente: reejecutarlo falla en los `CREATE TABLE`.

---

## 3. Arquitectura objetivo

```mermaid
flowchart LR
    APP[Backend NestJS<br/>:3001] -->|DATABASE_URL<br/>localhost:5433| DB[(Postgres 16<br/>club-deportivo-db)]
    DB --- VOL[(volumen pgdata)]
    MIG[0001_baseline<br/>prisma migrate deploy] -->|crea el esquema| DB
    SEED[20-seed.sql<br/>idempotente] -->|carga datos de dev| DB
```

El contenedor arranca **vacío**: no monta SQL en `docker-entrypoint-initdb.d`.
`scripts/db-up.sh` aplica las migraciones de Prisma y después el seed. Así hay
una sola fuente de verdad del esquema y el camino local es el mismo que en
staging/producción.

### Estructura de archivos a crear

```
docker-compose.yml
.env.example                                # POSTGRES_* (raíz)
backend/.env.example                        # agregar bloque local
backend/db/seed/20-seed.sql                 # admin + canchas + franjas + equipos
scripts/db-up.sh
scripts/db-reset.sh
scripts/db-psql.sh
package.json                                # scripts db:*
.gitignore                                  # pgdata/
backend/prisma/schema.prisma                # 12 @@map
backend/prisma/migrations/0001_baseline/
backend/prisma/migrations/migration_lock.toml
```

---

## 4. Tareas a completar

### Fase 0 — Preparación

- [x] Verificar `docker --version` y `docker compose version`.
- [x] Comprobar que el puerto **5433** está libre (`ss -ltn | grep 5433`).
- [x] Crear `.env` en la raíz (ignorado por git) con:
  - [x] `POSTGRES_DB=club_deportivo`
  - [x] `POSTGRES_USER=club_deportivo`
  - [x] `POSTGRES_PASSWORD=club_deportivo_dev`
  - [x] `POSTGRES_PORT=5433`
- [x] Crear `.env.example` en la raíz con los mismos nombres y valores de dev.

**Criterio:** cumplido.

### Fase 1 — Contenedor PostgreSQL

- [x] Crear `docker-compose.yml` con:
  - [x] servicio `db` con `postgres:16-alpine`
  - [x] `POSTGRES_*` desde variables de entorno
  - [x] `ports: "${POSTGRES_PORT:-5433}:5432"`
  - [x] volumen `pgdata:/var/lib/postgresql/data`
  - [x] **sin** montajes en `docker-entrypoint-initdb.d`
  - [x] `healthcheck` con `pg_isready` (`start_period: 15s`)
  - [x] `TZ` / `PGTZ` = `America/Argentina/Buenos_Aires`
- [x] Verificar que el contenedor arranque vacío (`up -d db --wait`).

**Criterio:** cumplido — contenedor `healthy`; el esquema se aplica después con
`scripts/db-up.sh` (`prisma migrate deploy`) y el seed.

> ⚠️ No montar `backend/db/` en `initdb`: contiene esquemas obsoletos
> (`schema.sql`, `esquemaUltimo.sql`, etc.) que se ejecutarían en orden
> alfabético y competirían con las migraciones de Prisma.

### Fase 2 — Seed de desarrollo

- [x] Crear `backend/db/seed/20-seed.sql` **idempotente** (UUIDs fijos +
      `ON CONFLICT DO NOTHING`).
- [x] Insertar en este orden (por los triggers):
  - [x] persona admin
  - [x] contacto `EMAIL` activo
  - [x] usuario `ADMINISTRADOR` / `ACTIVO` con `id_contacto_login` y hash bcrypt
  - [x] 6 canchas (2 por disciplina)
  - [x] franjas horarias (`dia_semana` 0–6, alineado con `EXTRACT(DOW)`)
  - [x] equipamiento (2 por disciplina, `stock_disponible = stock_total`)
- [x] Documentar el email y la contraseña de dev en el `README.md` (no en git).
- [x] Primer arranque: `pnpm db:up`.
- [x] Confirmar `healthy` (`docker compose ps`) y revisar `docker compose logs db`.
- [x] Verificar el seed con un reset desde cero: `pnpm db:reset`.

**Criterio:** cumplido — 1 admin, 6 canchas, 126 franjas, 6 equipos y
3 disciplinas después de un reset.

### Fase 3 — Scripts y DX

- [x] Crear `scripts/db-up.sh` (`up -d db --wait` + `pg_isready` +
      `prisma migrate deploy` + seed).
- [x] Crear `scripts/db-reset.sh` (`down -v` con confirmación + `db-up`).
- [x] Crear `scripts/db-psql.sh` (`docker compose exec db psql`).
- [x] Dar permisos: `chmod +x scripts/*.sh`.
- [x] Agregar scripts al `package.json` raíz:
  - [x] `db:up`
  - [x] `db:down`
  - [x] `db:reset`
  - [x] `db:psql`
  - [x] `db:logs`
  - [x] `db:seed`
  - [x] `db:baseline`
- [x] Agregar `pgdata/` y `.docker/` al `.gitignore`.

**Criterio:** cumplido — `pnpm db:up`, `pnpm db:psql` y `pnpm db:reset` probados.

### Fase 4 — Conexión del backend y Prisma

- [x] Agregar `DATABASE_URL` local a `backend/.env`:
      `postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo?schema=public`
- [x] Agregar el mismo bloque comentado a `backend/.env.example`.
- [x] Agregar los 12 `@@map` en `backend/prisma/schema.prisma`:

  | Modelo | Tabla |
  |---|---|
  | `Persona` | `personas` |
  | `ContactoPersona` | `contactos_persona` |
  | `DireccionPersona` | `direcciones_persona` |
  | `Usuario` | `usuarios` |
  | `SolicitudPermiso` | `solicitudes_permiso` |
  | `RegistroAuditoria` | `registros_auditoria` |
  | `Disciplina` | `disciplinas` |
  | `Cancha` | `canchas` |
  | `FranjaHoraria` | `franjas_horarias` |
  | `Equipamiento` | `equipamientos` |
  | `Reserva` | `reservas` |
  | `DetalleAlquilerEquipamiento` | `detalle_alquiler_equipamiento` |

- [x] Ejecutar `pnpm prisma generate` en `backend/`.
- [x] Crear `backend/prisma/migrations/0001_baseline/migration.sql`
      (copia de `esquema-final.sql` + cabecera).
- [x] Crear `backend/prisma/migrations/migration_lock.toml`
      (`provider = "postgresql"`).
- [x] Aplicar el baseline con `pnpm prisma migrate deploy` (tanto en una base
      limpia como en la base local ya poblada).
- [x] Verificar `pnpm prisma migrate status`.

**Criterio:** cumplido — `migrate status` limpio, `migrate deploy` verificado
en una base limpia y el backend responde `health`, `disciplines` y `login`.

### Fase 5 — Verificación

- [x] Estructura (verificada el 26/10/2026 tras `pnpm db:reset`):
  - [x] 12 tablas (excluyendo `_prisma_migrations`)
  - [x] 18 triggers
  - [x] 15 funciones `fn_*`
  - [x] 1 vista
  - [x] 3 disciplinas
- [ ] Reglas de negocio:
  - [ ] 3.ª reserva `CONFIRMADA` del mismo usuario → rechazada
  - [ ] reserva duplicada (cancha/fecha/franja) → rechazada
  - [x] alquiler → stock baja exactamente 1 (verificado por API el 26/10/2026)
  - [x] devolución/cancelación → stock se restaura (verificado por API el 26/10/2026)
  - [ ] 3 incumplimientos → usuario `SUSPENDIDO`
  - [ ] reserva de usuario `PENDIENTE`/`SUSPENDIDO` → rechazada
- [ ] Auditoría append-only con rol no owner (`club_app`, ver plan §7.3).
- [ ] Backend contra el contenedor:
  - [x] `GET /api/v1/health`
  - [x] `GET /api/v1/disciplines`
  - [x] `POST /api/v1/auth/login` con el usuario del seed
- [ ] Cerrar con un reset limpio: `./scripts/db-reset.sh`.

**Criterio:** reset desde cero + todos los checks en verde + backend operable.

### Fase 6 — Cierre y documentación

- [ ] Actualizar `README.md` con "Base de datos local (Docker)".
- [ ] Actualizar `docs/continuar.md` (Fase 1) con lo efectivamente hecho.
- [ ] Marcar `docs/plan-postgres-docker.md` como implementado o eliminarlo si
      `docker.md` lo reemplaza.
- [ ] Verificar que `.env` y `pgdata/` no aparezcan en `git status`.
- [ ] Commit con convención `feat(db): ...`.

---

## 5. Progreso

| Fase | Estado | Fecha |
|---|---|---|
| 0 — Preparación | ✅ Hecho | 2026-10-26 |
| 1 — Contenedor | ✅ Hecho | 2026-10-26 |
| 2 — Seed | ✅ Hecho | 2026-10-26 |
| 3 — Scripts | ✅ Hecho | 2026-10-26 |
| 4 — Prisma | ✅ Hecho | 2026-10-26 |
| 5 — Verificación | 🟡 En curso (estructura y backend OK) | 2026-10-26 |
| 6 — Cierre | ⬜ Pendiente | — |

Leyenda: ⬜ Pendiente · 🟡 En curso · ✅ Hecho · ⛔ Bloqueado

### Registro de ejecución

**2026-10-26 — B0–B2 completados**

- Contenedor `club-deportivo-db` en estado `healthy` en `localhost:5433`.
- Verificado tras un reset desde cero:
  - 12 tablas, 18 triggers, 15 funciones, 1 vista.
  - 3 disciplinas, 1 persona/contacto/usuario admin, 6 canchas, 126 franjas, 6 equipamientos.
- `pnpm db:up`, `pnpm db:psql` y `pnpm db:reset` probados.
- Rama: `feature/postgres-docker`.
- **Siguiente:** Fase 5 — verificación de reglas de negocio.

**2026-10-26 — B3 completado**

- 12 `@@map` agregados; `prisma validate` y `prisma generate` OK.
- Baseline `0001_baseline` aplicado en una base limpia (`club_deportivo_migrate_test`):
  12 tablas de negocio, 18 triggers, 15 funciones, 1 vista.
- Baseline `0001_baseline` aplicado con `prisma migrate deploy` en
  `club_deportivo`; `migrate status` limpio.
- `backend/.env` creado; `lint`, `typecheck`, `db:seed` y `prisma:migrate:deploy` operativos.
- Backend probado contra el contenedor: `health`, `disciplines` y `login` OK.
- Tests: 30/30 en verde.

---

## 6. Cómo retomar

### 6.1 Ver el estado actual

```bash
git status
docker ps -a --filter name=club-deportivo-db
docker volume ls | grep club-deportivo
docker compose ps            # si ya existe el compose
```

### 6.2 Siguiente paso inmediato

La base y Prisma ya están operativos. Continuar con la **Fase 5** (verificación):

```bash
pnpm db:reset
# Smoke tests de reglas: 3.ª reserva, duplicados, stock y auditoría.
cd backend && pnpm start:dev
```

Comandos de estado:

```bash
docker compose ps
docker compose exec db psql -U club_deportivo -d club_deportivo -c '\dt'
cd backend && pnpm prisma migrate status
```

### 6.3 Comandos de referencia

```bash
pnpm db:up        # levantar, migrar y sembrar
pnpm db:psql      # consola psql
pnpm db:seed      # reaplicar el seed (idempotente)
pnpm db:logs      # logs del contenedor
pnpm db:reset     # borrar volumen y recrear desde cero
```

### 6.4 Bloqueantes conocidos

1. **`esquema-final.sql` no es idempotente** → se aplica como migración
   baseline sobre una base vacía; el reset siempre es `down -v`.
2. **`esquema-final.sql` y Prisma deben evolucionar juntos** → cualquier cambio
   de DDL va en una migración nueva (`prisma migrate dev`), no editando el
   baseline. `scripts/db-baseline.sh` solo sirve para regenerar el baseline
   inicial.
3. **RLS sin policies** → en local se conecta como owner (bypass). Para probar
   append-only hace falta un rol no owner.
4. **Stock:** resuelto el 26/10/2026. El servicio ya no descuenta/restaura
   stock; la única fuente de verdad son los triggers `trg_validar_alquiler` y
   `trg_gestionar_devolucion`. Verificado por API: 8 → 7 → 8.
5. **Despliegue AWS:** la infraestructura está escrita y validada
   (`infra/terraform/`) pero **no aplicada**. Faltan cuenta AWS, state remoto,
   dominio y presupuesto (Fase 0). Ver `docs/despliegue-aws.md`.
6. **App Runner:** AWS dejó de aceptar clientes nuevos (octubre de 2026).
   Verificar el acceso antes de aplicar; la alternativa es ECS Express Mode.

---

## 7. Referencias

- `backend/db/esquema-final.sql` — esquema autoritativo
- `backend/db/migrations/001_restrict_reservations_active_users.sql` — migración manual existente
- `backend/prisma/schema.prisma` — modelos Prisma (12 `@@map` a snake_case)
- `backend/.env.example` — variables de entorno del backend
- `docs/despliegue-aws.md` — despliegue objetivo en AWS (Terraform/App Runner/RDS)
- `docs/plan-postgres-docker.md` — plan detallado con snippets de compose/scripts
- `docs/plan-ejecucion-docker.md` — orden de ejecución, cronograma, gates y rollback
- `docs/continuar.md` — estado general del proyecto y fases

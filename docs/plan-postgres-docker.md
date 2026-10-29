# Plan — PostgreSQL local en Docker

> Objetivo: tener una base PostgreSQL reproducible, desde cero, con el esquema
> autoritativo (`backend/db/esquema-final.sql`), datos mínimos de desarrollo y
> conexión desde el backend NestJS/Prisma vía `DATABASE_URL`.
>
> Alcance: **solo la base de datos**. No incluye Dockerfiles de backend/frontend
> (eso es la Fase 2 de `docs/continuar.md`).

---

## 0. Resumen de tareas

Checklist consolidado del plan. Estado verificado el **28/10/2026** contra el
repositorio y el stack local en Docker.

### Fase 0 — Preparación

- [x] Verificar `docker` y `docker compose`.
- [x] Crear `.env` raíz con `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` y `POSTGRES_PORT`.
- [x] Confirmar que el puerto host **5433** está libre.

### Fase 1 — Contenedor y bootstrap

- [x] `docker-compose.yml` con el servicio `db` (`postgres:16-alpine`), volumen `pgdata` y healthcheck.
- [x] `.env.example` raíz con las variables `POSTGRES_*`.
- [x] `backend/.env.example` con el bloque local de `DATABASE_URL`.
- [x] Seed idempotente `backend/db/seed/20-seed.sql` (admin, 6 canchas, franjas y 6 equipamientos).
- [x] Scripts `scripts/db-up.sh`, `db-reset.sh`, `db-psql.sh`, `db-seed.sh` y `db-baseline.sh` (ejecutables).
- [x] Scripts de `package.json`: `db:up`, `db:down`, `db:reset`, `db:psql`, `db:seed`, `db:baseline`, `db:logs`.
- [x] `.gitignore` con `pgdata/`, `.docker/` y variantes de `.env`.

### Fase 2 — Conexión del backend y Prisma

- [x] `backend/.env` local con `DATABASE_URL` apuntando a `localhost:5433`.
- [x] Los 12 modelos de `backend/prisma/schema.prisma` tienen `@@map` a snake_case.
- [x] Baseline `backend/prisma/migrations/0001_baseline/migration.sql` generado desde `esquema-final.sql`.
- [x] `migration_lock.toml` con `provider = "postgresql"`.
- [x] `prisma migrate deploy` aplicado: `0001_baseline` figura como aplicada.
- [x] `scripts/db-baseline.sh` permite regenerar el baseline sin editar el SQL a mano.
- [x] Backend responde `health` (200) contra la base del contenedor.

### Fase 3 — Verificación

- [x] Conteos de estructura: **12 tablas**, **18 triggers**, **15 funciones `fn_*`**, **1 vista**.
- [x] Datos base: **3 disciplinas** (Fútbol, Pádel, Tenis), **6 canchas**, **1 usuario** administrador.
- [x] `db-reset.sh` implementado; el camino `down -v` → `up` → `migrate deploy` → seed está probado.
- [ ] Empaquetar los smoke tests de reglas de negocio (máximo 2 reservas, conflictos, stock, suspensiones) en `backend/db/seed/99-smoke.sql` o tests e2e.
- [ ] Probar la regla append-only de `registros_auditoria` con el rol no owner `club_app`.
- [ ] Tests e2e reales: falta `backend/test/jest-e2e.json` (hoy `test:e2e` no corre).

### Fuera de alcance (no bloquea este plan)

- [ ] `CREATE POLICY` de RLS y rol de aplicación definitivo.
- [x] Dockerfiles de backend/frontend: ya existen y están integrados al compose.
- [ ] CI con servicio PostgreSQL y migración del esquema de producción (`docs/migracion-inicial.sql`).

### Comandos rápidos

```bash
pnpm db:up        # levanta db + migraciones + seed
pnpm db:psql      # consola psql en el contenedor
pnpm db:reset     # borra el volumen y recrea todo (pide confirmación)
pnpm db:seed      # reaplica el seed (idempotente)
pnpm db:logs      # logs del contenedor
```

> Las secciones 1–10 conservan el análisis y el detalle original del plan; este
> resumen refleja el estado actual de implementación.

---

## 1. Punto de partida (hallazgos)

| Hecho | Consecuencia para el plan |
|---|---|
| Al inicio no existían `Dockerfile`, `docker-compose.yml` ni `.dockerignore`. | Se crearon el compose, los Dockerfiles y los scripts desde cero (hoy ya están en el repo). |
| `backend/db/esquema-final.sql` (1965 líneas) es **DDL**, no un dump. | No crea la base ni el rol: eso lo hace la imagen de Postgres. |
| No es idempotente: 12 `CREATE TABLE` sin `IF NOT EXISTS`. | Solo se puede aplicar sobre una base vacía. El reset requiere `down -v`. |
| Contiene `CREATE EXTENSION pgcrypto`, 12 tablas, 1 vista, 15 funciones, 18 triggers, RLS en 12 tablas y seed de 3 disciplinas. | El plan debe verificar esos conteos. |
| RLS está **habilitado pero sin `CREATE POLICY`**. | El usuario dueño/superuser del contenedor las ignora (bypass). Para desarrollo se conecta como owner. Las policies quedan pendientes. |
| `REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC` no frena al dueño ni al superusuario. | La regla append-only solo se prueba con un rol no owner (ver §6.3). |
| `backend/prisma/schema.prisma` tenía 12 modelos en **PascalCase y sin `@@map`**, mientras el SQL usa **snake_case**. | **Resuelto:** los 12 `@@map` ya están aplicados. |
| No había migraciones Prisma (`backend/prisma/migrations/` no existía). | **Resuelto:** baseline `0001_baseline` creado y verificado con `migrate deploy`. |
| `backend/.env.example` solo tiene la URL de Supabase; no hay `.env` real. | Hay que documentar el bloque local y crear `backend/.env` (ignorado por git). |
| No hay cliente `psql` instalado en el host. | Toda operación SQL se hace con `docker compose exec db psql`. |
| `esquema-final.sql` ya inserta Fútbol, Tenis y Pádel. | El seed adicional no debe duplicarlas. |
| Los `.sql` obsoletos (`schema.sql`, `esquemaUltimo.sql`, etc.) están en `backend/db/`. | **No** montar el directorio completo en `initdb`: el contenedor arranca vacío y el esquema se aplica con `prisma migrate deploy`. |

---

## 2. Decisiones propuestas

| Tema | Decisión | Motivo |
|---|---|---|
| Imagen | `postgres:16-alpine` | Cumple 14+, es la versión objetivo de `docs/continuar.md`; pgcrypto viene incluido. |
| Nombre de base / usuario | `club_deportivo` / `club_deportivo` | Simple y alineado al dominio. En el contenedor el usuario es superuser. |
| Puerto host | **5433** → 5432 | Evita choque con un Postgres/Supabase local en 5432. |
| Persistencia | Volumen nombrado `pgdata` | Evita problemas de permisos de bind mounts en Linux. |
| Bootstrap del esquema | `prisma migrate deploy` sobre una base vacía | Una sola fuente de verdad; mismo camino que staging/producción. |
| Reset | `docker compose down -v` + `up` | Única forma limpia dada la no idempotencia. |
| Seed | Archivo aparte, idempotente | No tocar el esquema autoritativo. |
| Prisma | `@@map` + baseline `0001_baseline` | Resolver la doble fuente de verdad. |
| Entorno | `.env` en raíz (compose) y `backend/.env` (app) | `main.ts` ya carga `backend/.env` con dotenv. Ambos ignorados por git. |

Supuestos: se usa `postgres:16-alpine`, puerto host `5433` y un seed mínimo
(1 administrador, 6 canchas, franjas y equipamiento). Si preferís 5432 o
`postgres:14`, solo cambian dos líneas del compose.

---

## 3. Entregables

```
docker-compose.yml                          # servicio db (+ volumen)
.env.example                                # variables POSTGRES_* (raíz)
backend/.env.example                        # agregar bloque local de DATABASE_URL
backend/db/seed/20-seed.sql                 # admin + canchas + franjas + equipos
scripts/db-up.sh                            # levanta y espera healthy
scripts/db-reset.sh                         # down -v + up (con confirmación)
scripts/db-psql.sh                          # consola psql dentro del contenedor
package.json                                # scripts db:up / db:down / db:reset / db:psql
.gitignore                                  # pgdata/ y variantes de .env
backend/prisma/schema.prisma                # 12 @@map
backend/prisma/migrations/0001_baseline/    # baseline = esquema-final.sql
backend/prisma/migrations/migration_lock.toml
```

> `backend/db/esquema-final.sql` **no se modifica**: es la fuente del baseline
> `0001_baseline` y se aplica vía `prisma migrate deploy`.

---

## 4. Fase 0 — Preparación (15 min)

1. Verificar tooling:
   ```bash
   docker --version            # 29.x ✓
   docker compose version      # v5.x ✓
   ```
2. Crear el `.env` de la raíz (ignorado por git) a partir de `.env.example`:
   ```dotenv
   POSTGRES_DB=club_deportivo
   POSTGRES_USER=club_deportivo
   POSTGRES_PASSWORD=club_deportivo_dev
   POSTGRES_PORT=5433
   ```
3. Confirmar que el puerto 5433 está libre:
   ```bash
   ss -ltn | grep 5433 || echo "libre"
   ```

---

## 5. Fase 1 — Contenedor y bootstrap (45–60 min)

### 5.1 `docker-compose.yml`

```yaml
name: club-deportivo

services:
  db:
    image: postgres:16-alpine
    container_name: club-deportivo-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-club_deportivo}
      POSTGRES_USER: ${POSTGRES_USER:-club_deportivo}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-club_deportivo_dev}
      TZ: America/Argentina/Buenos_Aires
      PGTZ: America/Argentina/Buenos_Aires
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 15s

volumes:
  pgdata:
```

Notas:
- El contenedor arranca **vacío**: no se monta nada en `docker-entrypoint-initdb.d`.
  El esquema lo aplica `scripts/db-up.sh` con `prisma migrate deploy` y luego el
  seed (`scripts/db-seed.sh`).
- El usuario del contenedor es superuser, así que `CREATE EXTENSION pgcrypto` y
  la shadow database de Prisma funcionan sin configuración extra.
- `TZ`/`PGTZ` importan: `franjas_horarias.dia_semana` usa `EXTRACT(DOW)` (0=domingo).

### 5.2 Seed `backend/db/seed/20-seed.sql`

Debe ser **idempotente** (`ON CONFLICT DO NOTHING` con UUIDs fijos):

1. Persona admin (`dni` ficticio) + contacto `EMAIL` activo.
2. `usuarios`: `ADMINISTRADOR` / `ACTIVO`, `id_contacto_login` apuntando al
   contacto anterior, `password_hash` bcrypt (generado con la librería del
   backend; documentar la contraseña de dev en el README, no en git).
3. 6 canchas (2 por disciplina ya sembrada: Fútbol, Tenis, Pádel).
4. Franjas horarias (p. ej. 7 días × 3 franjas por cancha, `dia_semana` 0–6).
5. Equipamiento (2 ítems por disciplina, `stock_disponible = stock_total`).

Respetar:
- `uq_cancha_disciplina_nombre` y `uq_equipamiento_disciplina_nombre`.
- `uq_franja (id_cancha, dia_semana, hora_inicio)`.
- `trg_validar_contacto_login`: el email de login debe existir, ser `EMAIL`,
  `ACTIVO` y pertenecer a la persona **antes** del `INSERT` en `usuarios`.
- El seed no debe duplicar las 3 disciplinas del esquema.

### 5.3 Scripts

`scripts/db-up.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose up -d db --wait
docker compose exec -T db pg_isready \
  -U "${POSTGRES_USER:-club_deportivo}" \
  -d "${POSTGRES_DB:-club_deportivo}"
```

`scripts/db-reset.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p "⚠️  Esto borra el volumen pgdata. ¿Continuar? [y/N] " ok
[[ "$ok" == "y" ]] || exit 1
docker compose down -v --remove-orphans
exec ./scripts/db-up.sh
```

`scripts/db-psql.sh`
```bash
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
docker compose exec db psql \
  -U "${POSTGRES_USER:-club_deportivo}" \
  -d "${POSTGRES_DB:-club_deportivo}"
```

`chmod +x scripts/*.sh`.

Scripts en el `package.json` raíz (donde vive el compose):
```json
{
  "scripts": {
    "db:up": "docker compose up -d db --wait",
    "db:down": "docker compose down",
    "db:reset": "./scripts/db-reset.sh",
    "db:psql": "./scripts/db-psql.sh",
    "db:logs": "docker compose logs -f db"
  }
}
```

### 5.4 `.gitignore`

Agregar:
```gitignore
pgdata/
.docker/
```
`.env` ya está ignorado; **no** lo está `.env.example` (correcto).

---

## 6. Fase 2 — Conexión del backend y verificación (45–60 min)

### 6.1 `backend/.env`

```dotenv
DATABASE_URL="postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo?schema=public"
```

Agregar el mismo bloque (comentado) a `backend/.env.example`.

### 6.2 Alinear Prisma con el esquema SQL

Agregar `@@map` a los 12 modelos de `backend/prisma/schema.prisma`:

| Modelo | `@@map` |
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

Luego:
```bash
cd backend && pnpm prisma generate
```

### 6.3 Baseline de migraciones

1. Crear `backend/prisma/migrations/0001_baseline/migration.sql`:
   copia de `backend/db/esquema-final.sql` con una cabecera de identificación.
2. Crear `backend/prisma/migrations/migration_lock.toml`:
   ```toml
   provider = "postgresql"
   ```
3. Aplicar el baseline sobre la base vacía (lo hace `scripts/db-up.sh`):
   ```bash
   cd backend
   pnpm prisma migrate deploy
   ```
4. Verificar que `_prisma_migrations` tenga la fila y que `migrate status` esté
   limpio:
   ```bash
   pnpm prisma migrate status
   ```
5. A partir de aquí, los cambios futuros se hacen con:
   ```bash
   pnpm prisma migrate dev --name <descripcion>
   ```
   (el usuario del contenedor es superuser, así que Prisma puede crear la
   shadow database sin configuración extra).

> Las bases creadas antes de este cambio (con el esquema aplicado por `initdb`)
> se pueden marcar con `pnpm prisma migrate resolve --applied 0001_baseline`.
> Hoy ya no hace falta: `pnpm db:reset` recrea todo con `migrate deploy`.

### 6.4 Arrancar la app contra el contenedor

```bash
pnpm db:up                 # o ./scripts/db-up.sh
cd backend && pnpm start:dev
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/disciplines
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<email del seed>","password":"<password del seed>"}'
```

---

## 7. Verificación (Definition of Done)

### 7.1 Estructura

```sql
-- 12 tablas (excluye _prisma_migrations)
SELECT count(*) FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_type = 'BASE TABLE'
   AND table_name <> '_prisma_migrations';

-- 18 triggers
SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;

-- 15 funciones fn_*
SELECT count(*) FROM pg_proc p
 JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.proname LIKE 'fn_%';

-- 1 vista
SELECT count(*) FROM information_schema.views WHERE table_schema = 'public';

-- 3 disciplinas
SELECT nombre FROM disciplinas ORDER BY nombre;  -- Fútbol, Pádel, Tenis

-- seed propio
SELECT count(*) FROM canchas;      -- 6
SELECT count(*) FROM usuarios;     -- >= 1
```

### 7.2 Reglas de negocio (smoke tests)

| Caso | Resultado esperado |
|---|---|
| 3.ª reserva `CONFIRMADA` del mismo usuario | Excepción del trigger (`máximo 2`) |
| Reserva duplicada de la misma cancha/fecha/franja | Rechazada por el índice único parcial |
| Alquiler de equipamiento | `stock_disponible` baja exactamente 1 |
| Devolución / cancelación | `stock_disponible` vuelve al valor previo |
| 3 incumplimientos de equipamiento | Usuario pasa a `SUSPENDIDO` |
| Reserva de usuario `PENDIENTE`/`SUSPENDIDO` | Rechazada por `fn_validar_reserva` |

Estos casos conviene empaquetarlos en un `backend/db/seed/99-smoke.sql` o en
tests e2e contra el contenedor (hoy `test:e2e` está roto: falta
`backend/test/jest-e2e.json`).

### 7.3 Auditoría append-only (con rol no owner)

El owner y el superusuario ignoran `REVOKE`. Para probar de verdad:

```sql
CREATE ROLE club_app LOGIN PASSWORD 'club_app_dev' BYPASSRLS;
GRANT CONNECT ON DATABASE club_deportivo TO club_app;
GRANT USAGE ON SCHEMA public TO club_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO club_app;
REVOKE UPDATE, DELETE ON registros_auditoria FROM club_app;
```

```bash
docker compose exec db psql -U club_app -d club_deportivo \
  -c "UPDATE registros_auditoria SET accion='x';"   # debe fallar
```

> `BYPASSRLS` se usa solo para el test; sin él, al no haber policies, el rol
> vería 0 filas. Las policies de RLS quedan fuera de este plan.

### 7.4 Criterio de aceptación

```bash
./scripts/db-reset.sh
```
deja una base usable desde cero, los conteos de §7.1 pasan y el backend
responde `health`, `disciplines` y `login`.

---

## 8. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El esquema no es idempotente | Se aplica una sola vez como migración sobre una base vacía; para reaplicar usar `db:reset` (`down -v`) |
| Cambiar un `.sql` no afecta una BD existente | Crear una migración nueva con `prisma migrate dev`; el baseline no se edita |
| `esquema-final.sql` tiene triggers que pueden rechazar el seed (login, gestor) | Ordenar inserts: persona → contacto → usuario; el seed es idempotente y se prueba en cada reset |
| RLS sin policies | En local se conecta como owner (bypass). No exponer el contenedor a otros roles sin policies |
| `pgdata` con datos viejos tras cambiar el esquema | `db:reset`; nunca `ALTER` manual sin migración |
| Puerta 5432 ocupada | Host 5433 (ya previsto) |
| Prisma sin `@@map` | **Resuelto:** los 12 modelos mapeados; verificar con `pnpm prisma validate` |
| `.env` con credenciales commiteado | `.gitignore` ya cubre `.env`; usar solo `.env.example` |
| Divergencia con Supabase (pooler, RLS, dueño de tablas) | Mantener `backend/.env` local separado; no reutilizar el `.env` de producción |

---

## 9. Fuera de alcance / siguientes pasos

- Dockerfiles multi-stage de backend y frontend (Fase 2 de `docs/continuar.md`).
- `CREATE POLICY` de RLS y rol de aplicación definitivo.
- CI con servicio PostgreSQL (hoy `.github/workflows/ci.yml` no tiene `jobs`).
- Tests e2e reales (`backend/test/jest-e2e.json` no existe).
- Migración del esquema PascalCase de producción (`docs/migracion-inicial.sql`).

---

## 10. Estimación

| Fase | Trabajo | Tiempo |
|---|---|---|
| 0 | Verificación y `.env` | 15 min |
| 1 | Compose + init + seed + scripts | 1–2 h |
| 2 | `@@map`, baseline, conexión y prueba de la app | 1–2 h |
| 3 | Verificación y smoke tests | 30–45 min |
| **Total** | | **≈ 3–5 h** |

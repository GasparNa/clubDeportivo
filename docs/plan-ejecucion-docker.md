# Planificación de ejecución — PostgreSQL en Docker

> Documento operativo. Responde **en qué orden** ejecutar las tareas de
> [`docs/docker.md`](./docker.md), con qué dependencias, cuánto tarda cada bloque
> y cómo validar antes de avanzar.
>
> **Estado:** 📋 Planificado · **Última actualización:** 2026-10-26
> **Plan técnico de referencia:** [`docs/plan-postgres-docker.md`](./plan-postgres-docker.md)

---

## 1. Criterio de éxito

Un solo comando deja la base usable desde cero y el backend opera contra ella:

```bash
pnpm db:reset
cd backend && pnpm start:dev
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/disciplines
```

Sin depender de Supabase, sin pasos manuales y sin secretos versionados.

---

## 2. Estrategia

| Principio | Por qué |
|---|---|
| **Esquema primero, datos después** | El contenedor arranca vacío. `db-up.sh` aplica `prisma migrate deploy` y recién después el seed idempotente. |
| **Un gate por bloque** | No avanzar a Prisma si la base no reproduce desde cero. |
| **Un commit por bloque** | Historial revisable y rollback simple. |
| **Nunca `git add -A`** | Hay archivos previos sin trackear (`docs/continuar.md`, `docs/resumen.md`). Usar rutas explícitas. |
| **Rama de feature** | `main` está protegido; todo va por PR (ver `AGENTS.md`). |

Rama sugerida:

```bash
git checkout main && git pull
git checkout -b feature/postgres-docker
```

---

## 3. Dependencias entre acciones

```mermaid
flowchart LR
    A[.env + compose] --> B[seed 20-seed.sql]
    B --> C[baseline Prisma]
    C --> D[primer db:up + verificación]
    D --> E[scripts db-*]
    E --> F[reset reproducible]
    F --> G[Prisma: 12 @@map + migrate deploy]
    G --> H[backend conectado]
    H --> I[smoke tests de reglas]
    I --> J[docs + commits]
```

Reglas de orden:

- **Baseline antes del primer `up`**: sin `0001_baseline` la base arranca vacía.
- **Seed después de las migraciones** (lo hace `scripts/db-up.sh`).
- **`@@map` antes de arrancar el backend** (si no, Prisma consulta tablas inexistentes).
- **Smoke tests al final**: requieren backend conectado y base estable.

---

## 4. Cronograma

| Bloque | Fases de `docker.md` | Duración | Hito | Estado |
|---|---|---|---|---|
| **B0** Preflight | Fase 0 | 15 min | G0: entorno y rama listos | ✅ 2026-10-26 |
| **B1** Base Docker + seed | Fases 1–2 | 75 min | G1: base `healthy` con esquema y seed | ✅ 2026-10-26 |
| **B2** Scripts y DX | Fase 3 | 40 min | G2: reset reproducible con un comando | ✅ 2026-10-26 |
| **B3** Prisma + backend | Fase 4 | 75 min | G3: app conectada y `migrate status` limpio | ✅ 2026-10-26 |
| **B4** Verificación + cierre | Fases 5–6 | 60 min | G4: reglas verificadas y docs/commits | ⬜ Pendiente |
| **Total** | | **≈ 4 h 25 min** | Buffer 30–45 min → **≈ 5 h** | |

> Se puede ejecutar en 2 sesiones: B0–B2 (≈ 2 h) y B3–B4 (≈ 2 h 15 min).

---

## 5. Plan detallado por bloque

### B0 — Preflight (15 min)

**Objetivo:** entorno listo, sin tocar la base todavía.

1. Crear rama:
   ```bash
   git checkout main && git pull
   git checkout -b feature/postgres-docker
   ```
2. Verificar tooling:
   ```bash
   docker --version
   docker compose version
   ss -ltn | grep -q ':5433' && echo "OCUPADO" || echo "libre"
   ```
3. Instalar dependencias del backend (necesarias para generar el hash bcrypt
   y para Prisma):
   ```bash
   pnpm install
   ```
4. Crear `.env` en la raíz (ignorado por git) y `.env.example`:
   ```dotenv
   POSTGRES_DB=club_deportivo
   POSTGRES_USER=club_deportivo
   POSTGRES_PASSWORD=club_deportivo_dev
   POSTGRES_PORT=5433
   ```

**Gate G0:** `docker` y `compose` responden, el puerto 5433 está libre,
`backend/node_modules` existe y `.env` no aparece en `git status`.

**Rollback:** `git checkout -` (la rama no tiene cambios aún).

---

### B1 — Base Docker + seed (75 min)

**Objetivo:** Postgres con el esquema autoritativo y datos de desarrollo.

1. Crear `docker-compose.yml` con el servicio `db` (ver snippet en
   `docs/plan-postgres-docker.md` §5.1). Puntos obligatorios:
   - `postgres:16-alpine`
   - puerto `${POSTGRES_PORT:-5433}:5432`
   - volumen `pgdata`
   - **sin** montajes en `docker-entrypoint-initdb.d`
   - `healthcheck` con `pg_isready`
   - `TZ`/`PGTZ` Argentina
2. Generar el hash bcrypt del admin de desarrollo:
   ```bash
   cd backend
   node -e "console.log(require('bcryptjs').hashSync('Admin1234!', 10))"
   ```
3. Crear `backend/db/seed/20-seed.sql` con UUIDs fijos e idempotente. Orden
   obligatorio por los triggers:
   - persona admin (`dni` ficticio)
   - contacto `EMAIL` activo (`admin@club.com`)
   - usuario `ADMINISTRADOR`/`ACTIVO` con `id_contacto_login` + hash
   - 6 canchas (2 por disciplina)
   - franjas horarias (`dia_semana` 0–6)
   - equipamiento (2 por disciplina)
4. **Con el baseline ya creado** (ver B3), levantar:
   ```bash
   pnpm db:up
   docker compose ps
   docker compose logs db
   ```
5. Verificar estructura:
   ```sql
   SELECT count(*) FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE';      -- 12
   SELECT count(*) FROM pg_trigger WHERE NOT tgisinternal;         -- 18
   SELECT count(*) FROM pg_proc p JOIN pg_namespace n
     ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname LIKE 'fn_%';           -- 15
   SELECT count(*) FROM information_schema.views
    WHERE table_schema='public';                                  -- 1
   SELECT nombre FROM disciplinas ORDER BY nombre;                -- 3
   SELECT count(*) FROM canchas;                                  -- 6
   SELECT count(*) FROM usuarios;                                 -- >= 1
   ```
6. Probar reproducibilidad desde cero:
   ```bash
   pnpm db:reset
   ```

**Gate G1:** contenedor `healthy`, conteos correctos y el reset manual vuelve a
dejar los mismos datos.

**Rollback:** `docker compose down -v`; corregir archivos y repetir.

---

### B2 — Scripts y DX (40 min)

**Objetivo:** operar la base con comandos del proyecto, no a mano.

1. Crear `scripts/db-up.sh`, `scripts/db-reset.sh`, `scripts/db-psql.sh`
   (ver plan §5.3).
2. `chmod +x scripts/*.sh`.
3. Agregar `db:up`, `db:down`, `db:reset`, `db:psql`, `db:logs` al
   `package.json` raíz.
4. Agregar `pgdata/` y `.docker/` al `.gitignore`.
5. Probar de punta a punta:
   ```bash
   pnpm db:up
   pnpm db:psql          # \dt y \q
   pnpm db:reset         # confirmar y verificar que vuelve a levantar
   ```
6. Actualizar `backend/.env.example` con el bloque local comentado.

**Gate G2:** `pnpm db:reset` reconstruye la base desde cero sin pasos manuales.

**Rollback:** los scripts son aditivos; `git restore` de los archivos nuevos no
aplica (son untracked). Basta con corregirlos.

---

### B3 — Prisma + backend (75 min)

**Objetivo:** que NestJS use la base local sin errores de nombres.

1. Crear `backend/.env`:
   ```dotenv
   DATABASE_URL="postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo?schema=public"
   ```
2. Agregar los 12 `@@map` en `backend/prisma/schema.prisma` (tabla completa en
   `docs/docker.md` §Fase 4).
3. Generar el cliente:
   ```bash
   cd backend && pnpm prisma generate
   ```
4. Crear `backend/prisma/migrations/0001_baseline/migration.sql` (copia de
   `esquema-final.sql` + cabecera) y `migration_lock.toml`.
5. Aplicar el baseline con `migrate deploy` (lo hace `pnpm db:up`):
   ```bash
   cd backend
   pnpm prisma migrate deploy
   pnpm prisma migrate status
   ```
6. Arrancar y probar:
   ```bash
   pnpm start:dev
   curl http://localhost:3001/api/v1/health
   curl http://localhost:3001/api/v1/disciplines
   curl -X POST http://localhost:3001/api/v1/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"email":"admin@club.com","password":"Admin1234!"}'
   ```

**Gate G3:** `migrate status` sin pendientes ni drift; los tres endpoints
responden y el login devuelve JWT.

**Rollback:** `docker compose down -v` + `pnpm db:reset`; revertir `@@map` con
`git restore backend/prisma/schema.prisma`.

---

### B4 — Verificación y cierre (60 min)

**Objetivo:** demostrar que las reglas del esquema funcionan y dejar el repo
listo para retomar.

1. Smoke tests de reglas (tabla en `docs/docker.md` §Fase 5). Puede ser SQL
   manual o un `backend/db/seed/99-smoke.sql`.
2. Auditoría append-only con rol no owner:
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
3. Reset final de comprobación:
   ```bash
   pnpm db:reset
   ```
4. Actualizar `README.md` y `docs/continuar.md`; marcar `docs/docker.md` con el
   progreso real.
5. Revisar que no se cuelen secretos:
   ```bash
   git status --short
   git check-ignore -v .env backend/.env pgdata/
   ```
6. Commits (rutas explícitas):
   ```bash
   git add docker-compose.yml .env.example .gitignore backend/db/seed/20-seed.sql
   git commit -m "chore(db): agrega postgres local en docker con esquema y seed"

   git add scripts/db-up.sh scripts/db-reset.sh scripts/db-psql.sh package.json backend/.env.example
   git commit -m "chore(db): agrega scripts de gestion de la base local"

   git add backend/prisma/schema.prisma backend/prisma/migrations
   git commit -m "feat(db): alinea prisma con el esquema sql y crea baseline"

   git add README.md docs/docker.md docs/plan-postgres-docker.md docs/plan-ejecucion-docker.md
   git commit -m "docs(db): documenta el entorno local de base de datos"
   ```

**Gate G4:** reset limpio + reglas verificadas + `git status` sin `.env` ni
`pgdata/` + PR abierto.

---

## 6. Gates de aceptación

| Gate | Cuándo | Criterio | Si falla |
|---|---|---|---|
| **G0** | Fin de B0 | Tooling OK, 5433 libre, rama creada | Liberar puerto / instalar Docker |
| **G1** | Fin de B1 | `healthy` + 12/18/15/1/3 + seed | Revisar logs y resetear `-v` |
| **G2** | Fin de B2 | `pnpm db:reset` funciona desde cero | Revisar permisos y rutas de scripts |
| **G3** | Fin de B3 | `migrate status` limpio + endpoints OK | Revisar `@@map`, baseline y `.env` |
| **G4** | Fin de B4 | Reglas OK, docs y commits, sin secretos | Completar antes del PR |

---

## 7. Paralelización

| Se puede hacer en paralelo | Ahorro |
|---|---|
| `docker pull postgres:16-alpine` mientras se escriben compose y seed | ~30–60 s |
| `pnpm install` mientras se redacta el seed | ~1–2 min |
| Escribir `backend/.env.example` mientras corre el primer `up` | ~1 min |

| **No** paralelizar | Motivo |
|---|---|
| `up`/`db:up` antes de crear `0001_baseline` | La base quedaría vacía |
| `migrate resolve` sobre una base ya migrada | El baseline quedaría mal registrado |
| Smoke tests antes de `@@map` | La app no conecta |

---

## 8. Riesgos por bloque

| Bloque | Riesgo | Detección | Acción |
|---|---|---|---|
| B1 | Falta el baseline o falla una migración | `pnpm db:up` aborta con el error de Prisma | Corregir la migración y `db:reset` |
| B1 | El seed viola un trigger (login/gestor) | `db:seed` falla (`ON_ERROR_STOP=1`) | Corregir orden de inserts y `db:reset` |
| B1 | Puerto ocupado | `up` falla con `address already in use` | Cambiar `POSTGRES_PORT` |
| B2 | `Permission denied` en scripts | `pnpm db:up` falla | `chmod +x scripts/*.sh` |
| B2 | `db:reset` borra datos por accidente | Prompt de confirmación | No ejecutar en producción |
| B3 | Falta un `@@map` o está mal | `PrismaClientKnownRequestError: relation does not exist` | Completar los 12 y `prisma generate` |
| B3 | Baseline aplicado dos veces | `migrate status` o error `already exists` | No reejecutar sobre una base existente; usar `db:reset` |
| B4 | Auditoría "pasa" siendo owner | UPDATE exitoso con `club_deportivo` | Probar con `club_app` (no owner) |
| B4 | Stock baja 2 por el servicio | Smoke test de stock falla | Eliminar el decrement/increment del servicio (ver §9) |

---

## 9. Bloqueante conocido fuera de este plan

`backend/src/reservas/reservas.service.ts` descuenta stock (~líneas 402-409) y
lo restaura (~líneas 471-477) **además** de los triggers del esquema. Los smoke
tests de stock por API fallarán hasta eliminarlo. Es una tarea de la Fase 1 de
`docs/continuar.md`, no de la base Docker, pero conviene hacerla antes de B4 o
verificar el stock directamente por SQL.

---

## 10. Cómo saber en qué bloque retomar

```bash
git branch --show-current
ls docker-compose.yml .env backend/db/seed/20-seed.sql scripts/db-*.sh 2>/dev/null
docker compose ps 2>/dev/null
docker volume ls | grep club-deportivo
cd backend && pnpm prisma migrate status 2>/dev/null
```

| Estado observado | Retomar en |
|---|---|
| No existe `docker-compose.yml` | **B0** |
| Existe compose, no existe `20-seed.sql` | **B1** (no levantar aún) |
| Base `healthy`, sin scripts | **B2** |
| Scripts OK, sin `@@map` | **B3** |
| App conectada, sin smoke tests | **B4** |
| Todo OK | Cerrar PR |

---

## 11. Definition of Done global

- [ ] `pnpm db:reset` deja la base desde cero sin pasos manuales.
- [ ] 12 tablas, 18 triggers, 15 funciones, 1 vista, 3 disciplinas + seed.
- [ ] `pnpm prisma migrate status` sin pendientes ni drift.
- [ ] `GET /health`, `GET /disciplines` y `POST /auth/login` funcionan contra Docker.
- [ ] Reglas de negocio verificadas (incluida auditoría append-only).
- [ ] `.env` y `pgdata/` fuera de git.
- [ ] README y `docs/docker.md` actualizados.
- [ ] PR `feature/postgres-docker` → `main` con CI verde.

---

## 12. Referencias

- [`docs/docker.md`](./docker.md) — resumen y checklist de tareas
- [`docs/plan-postgres-docker.md`](./plan-postgres-docker.md) — plan técnico con snippets
- [`docs/continuar.md`](./continuar.md) — estado general y fases del proyecto
- `backend/db/esquema-final.sql` — esquema autoritativo
- `backend/prisma/schema.prisma` — modelos Prisma

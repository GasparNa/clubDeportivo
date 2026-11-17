# Tests de reglas de negocio en PostgreSQL

La suite `backend/test/db/` ejercita los triggers reales de
`backend/db/esquema-final.sql` contra un PostgreSQL 16. No usa stubs ni mocks:
cada caso crea sus propios datos y los limpia al terminar.

## Requisitos

- Docker Compose con el servicio `db` (PostgreSQL 16) publicado en el puerto
  **5433**.
- Variables de entorno del contenedor por defecto: usuario `club_deportivo`,
  contraseña `club_deportivo_dev` y base `club_deportivo`.

```bash
docker compose up -d db
docker compose exec -T db pg_isready -U club_deportivo -d club_deportivo
```

## Base de prueba y guardia

- Por defecto la suite usa
  `postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo_test`.
- Se puede apuntar a otro servidor con `TEST_DATABASE_URL`. Nunca se lee
  `DATABASE_URL` como respaldo.
- `global-setup.js` valida que el nombre de la base termine en `_test`; si no,
  aborta la corrida antes de conectarse. Además, cada spec verifica en runtime
  con `SELECT current_database()` que la base conectada termine en `_test`.
- En cada corrida se elimina y recrea la base de prueba (`DROP DATABASE ... WITH
  (FORCE)` + `CREATE DATABASE`) y se aplica `backend/db/esquema-final.sql`
  completo. La base de desarrollo no se toca porque la guardia exige el sufijo
  `_test`.

## Comandos

```bash
# Suite completa de reglas de negocio
pnpm --dir backend run test:db

# Un archivo o un caso puntual
pnpm --dir backend run test:db -- reservas.db-spec.ts
pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"
```

El script `test:db` usa `backend/test/db/jest-db.config.js` (sin
`moduleNameMapper`, sin stubs) y corre con `--runInBand`. El script `test` de la
suite unitaria no cambia.

## Reutilizar la base sin recrearla

`DB_TEST_SKIP_SETUP=1` omite el drop/create y la aplicación del esquema, pero
mantiene la validación del sufijo `_test`. Se usa para la prueba de sanidad:

```powershell
$env:DB_TEST_SKIP_SETUP = "1"
pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"
Remove-Item Env:DB_TEST_SKIP_SETUP
```

```bash
DB_TEST_SKIP_SETUP=1 pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"
```

## Sanidad: un trigger deshabilitado debe romper la suite

1. Deshabilitar el trigger sobre la base de prueba:

   ```bash
   docker compose exec -T db psql -U club_deportivo -d club_deportivo_test \
     -c "ALTER TABLE reservas DISABLE TRIGGER trg_validar_reserva;"
   ```

2. Correr el caso que depende del trigger, sin recrear la base. Debe fallar:

   ```bash
   DB_TEST_SKIP_SETUP=1 pnpm --dir backend run test:db -- \
     reservas.db-spec.ts -t "cancha en mantenimiento"
   ```

3. Volver a habilitar el trigger y repetir. Debe pasar:

   ```bash
   docker compose exec -T db psql -U club_deportivo -d club_deportivo_test \
     -c "ALTER TABLE reservas ENABLE TRIGGER trg_validar_reserva;"
   pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"
   ```

4. Confirmar que no quedó ningún trigger deshabilitado:

   ```bash
   docker compose exec -T db psql -U club_deportivo -d club_deportivo_test \
     -tAc "SELECT count(*) FROM pg_trigger WHERE tgenabled = 'D';"
   ```

   La consulta debe devolver `0`.

## Cobertura

| Función | Spec |
|---|---|
| `fn_validar_reserva` | `reservas.db-spec.ts` |
| `fn_actualizar_reserva` | `actualizar-reserva.db-spec.ts` |
| `fn_validar_alquiler_equipamiento` | `alquiler.db-spec.ts` |
| `fn_gestionar_devolucion` | `devoluciones.db-spec.ts` |
| `fn_liberar_equipamiento_cancelado` | `liberar-cancelado.db-spec.ts` |
| `fn_recalcular_monto_reserva` | `recalcular-monto.db-spec.ts` |
| `fn_cancha_a_mantenimiento` | `mantenimiento.db-spec.ts` |
| `fn_auditar_reserva` | `auditoria.db-spec.ts` |

Los mensajes de error de los triggers quedan congelados en los asserts: si
cambia un `RAISE EXCEPTION`, el test falla a propósito.

## Nota sobre `fecha_devolucion_real`

`fn_gestionar_devolucion` es un trigger `AFTER UPDATE`; la asignación a
`NEW.fecha_devolucion_real` dentro de la función no persiste. El servicio de
reservas envía `fecha_devolucion_real` en el mismo `UPDATE`, y la suite replica
ese flujo (devolución con fecha real incluida) al verificar la devolución.

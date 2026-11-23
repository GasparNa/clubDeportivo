# Proposal

## Why

Las reglas de negocio centrales del club (límite de reservas, cancelación con
anticipación, control de stock, devoluciones, suspensiones y auditoría) viven en
triggers de PostgreSQL y hoy ningún test las ejecuta: la suite de Jest usa stubs
(`moduleNameMapper` a `backend/stubs`), por lo que una regresión en
`backend/db/esquema-final.sql` pasaría desapercibida. Este change agrega una
suite de integración contra un PostgreSQL real para congelar el comportamiento
actual de los triggers antes de seguir modificando el esquema.

## What Changes

- Agregar una suite de tests de integración en `backend/test/db/`, con su propia
  configuración de Jest sin `moduleNameMapper` ni stubs.
- Agregar el script `test:db` en `backend/package.json`. El script `test`
  existente no cambia.
- Crear una base de pruebas separada (`club_deportivo_test`) a partir de
  `backend/db/esquema-final.sql`, usando el PostgreSQL de Docker Compose (puerto
  5433) o `TEST_DATABASE_URL`. La suite se niega a ejecutarse si el nombre de la
  base no termina en `_test`.
- Cubrir con casos felices y de error: `fn_validar_reserva` (incluida
  concurrencia con `Promise.all`), `fn_actualizar_reserva`,
  `fn_validar_alquiler_equipamiento`, `fn_gestionar_devolucion`,
  `fn_liberar_equipamiento_cancelado`, `fn_recalcular_monto_reserva`,
  `fn_cancha_a_mantenimiento` y `fn_auditar_reserva`.
- Documentar en `docs/` cómo levantar la base de pruebas y correr la suite.
- Incluir una verificación de sanidad manual que desactiva un trigger, confirma
  que un test falla y lo vuelve a activar.

## Capabilities

### New Capabilities

Ninguna. Es un change de tests y tooling: no introduce ni modifica
comportamiento observable del sistema. Las reglas que se prueban ya están
implementadas en `backend/db/esquema-final.sql` y documentadas en
`openspec/config.yaml`; la suite solo las caracteriza.

### Modified Capabilities

Ninguna. No cambian requisitos, contratos de API ni reglas de negocio.

Se declara `skip_specs: true` en `.openspec.yaml` porque no existe delta de
comportamiento que describir en `openspec/specs/`.

## Impact

- `backend/package.json`: nuevo script `test:db` y devDependencies `pg` /
  `@types/pg` (el lockfile de la raíz se actualiza).
- Nuevos archivos en `backend/test/db/` (configuración de Jest, setup de base,
  helpers y specs).
- Nuevo documento `docs/tests-db.md`.
- Sin cambios en `backend/src`, `frontend/src`, migraciones de Prisma ni
  `backend/db/esquema-final.sql`.
- Sin cambios en CI (el job se agrega en otro change); el script queda listo
  para invocarse a mano.

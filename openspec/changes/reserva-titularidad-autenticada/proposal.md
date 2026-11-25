## Why

`POST /api/v1/reservations` toma el titular (`id_persona`) y el `origen` del cuerpo de la petición sin validarlos contra el usuario autenticado; el parámetro `userId` de `ReservasService.crearReserva` se recibe pero no se usa. Esto permite que cualquier SOCIO autenticado cree reservas a nombre de otros usuarios o con origen `MANUAL_GERENCIA`, suplantando la titularidad y eludiendo el flujo previsto para gerencia.

## What Changes

- **BREAKING**: un SOCIO ya no puede crear reservas a nombre de otro usuario: si envía un `id_persona` distinto al `id_usuario` del token, la API responde 403. Antes, la reserva se creaba con el `id_persona` indicado sin verificación.
- **BREAKING**: un SOCIO ya no puede crear reservas con origen `MANUAL_GERENCIA`: la API responde 403. Antes, el `origen` del cuerpo se aceptaba tal cual.
- `id_persona` pasa a ser opcional en `CreateReservaDto`; para SOCIO se omite y la reserva se crea a su propio nombre.
- El servicio `crearReserva` recibe el actor completo (`id_usuario` y `rol`) desde `req.user` en lugar de solo el id, y resuelve la titularidad según el rol:
  - SOCIO: `id_persona` omitido o igual a su `id_usuario`; origen siempre `AUTOGESTIONADA`.
  - GERENTE / ADMINISTRADOR: comportamiento vigente, pueden indicar el `id_persona` de un usuario ACTIVO y el origen (`AUTOGESTIONADA` o `MANUAL_GERENCIA`).
- Fail-closed: si no hay actor o `id_usuario` en `req.user`, el servicio lanza `ForbiddenException` antes de consultar la base.
- Se mantienen vigentes las reglas existentes: usuario ACTIVO, franja libre y límite de 2 reservas confirmadas.
- Sin migraciones, sin cambios en triggers de PostgreSQL y sin cambios en `frontend/`.

## Capabilities

### New Capabilities

(ninguna)

### Modified Capabilities

- `gestion-reservas-turnos`: agrega el requisito `RF-RES-10` (titular y origen de la reserva según el rol del actor autenticado), restringiendo el comportamiento actual del endpoint de creación de reservas.

## Impact

- **Backend API**: `backend/src/reservas/reservas.controller.ts` (`POST /api/v1/reservations` pasa `req.user` completo al servicio), `backend/src/reservas/dto/reservas.dto.ts` (`id_persona` opcional) y `backend/src/reservas/reservas.service.ts` (`crearReserva` resuelve titularidad y origen por rol, fail-closed).
- **Tests**: `backend/src/reservas/reservas.service.spec.ts` (escenarios por rol y errores) y `backend/src/reservas/reservas.controller.spec.ts` (paso de `req.user` al servicio y guards declarados).
- **Compatibilidad**: clientes que enviaban `id_persona` de otro usuario u `origen: MANUAL_GERENCIA` con sesión de SOCIO ahora reciben 403; el frontend vigente no se ve afectado (no se envían esos campos a nombre de otros).
- **Fuera de alcance**: base de datos (triggers), `frontend/`, otros endpoints de reservas.

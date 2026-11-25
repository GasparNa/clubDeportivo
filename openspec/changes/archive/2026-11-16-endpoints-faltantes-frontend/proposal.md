## Why

Varias pantallas del frontend llaman endpoints que el backend no expone o cuya
forma de datos no coincide con la que consume la UI. Hoy esto rompe el detalle
de usuario del panel administrador, el detalle previo a registrar una devolución
de equipamiento y la bandeja/envío de notificaciones.

## What Changes

- Agregar `GET /api/v1/users/:id` para que un administrador consulte el detalle
  de un usuario en un objeto plano compatible con la pantalla existente.
- **BREAKING**: cambiar la forma de la respuesta de `GET /api/v1/users` para que
  devuelva una lista plana con los mismos campos que el detalle, sin
  `password_hash`, `id_contacto_login` ni relaciones anidadas; mantiene los
  filtros `rol` y `estado` y el acceso solo para `ADMINISTRADOR`.
- Agregar `GET /api/v1/equipment-rentals/:id` para consultar un alquiler por su
  detalle y poder registrar la devolución desde el frontend.
- **BREAKING**: al listar alquileres (`GET /api/v1/equipment-rentals`), un
  `SOCIO` solo verá los alquileres de sus propias reservas; `GERENTE` y
  `ADMINISTRADOR` conservan la visibilidad global.
- Agregar `GET /api/v1/notifications` para que cada usuario autenticado lea sus
  notificaciones derivadas de `registros_auditoria`, solo eventos de entidad
  `notificaciones` y como máximo las 100 más recientes, sin crear una tabla
  nueva.
- Ajustar `POST /api/v1/notifications` para aceptar `asunto`, `mensaje`, un
  `tipo` opcional y `id_usuario`, manteniendo el envío simulado actual y
  rechazando destinos inexistentes o payloads inválidos.
- No se modifican pantallas ni tipos del frontend en este cambio salvo que una
  tarea de implementación demuestre que es imprescindible; cualquier ajuste de
  ese tipo se reportará como tarea separada.

## Capabilities

### New Capabilities

- `gestion-usuarios-personas`: detalle y listado de usuarios para administración,
  ambos en forma plana y sin credenciales.
- `gestion-reservas-turnos`: consulta individual de alquileres de equipamiento y
  alcance de visibilidad por rol.
- `pagos-auditoria-notificaciones`: bandeja de notificaciones por usuario y
  envío simulado compatible con el contrato del frontend.

### Modified Capabilities

<!-- No se listan capacidades modificadas porque openspec/specs/ aún está vacío.
     Los paths coinciden con las capabilities del change club-deportivo-reservas,
     pero al no existir specs principales los deltas se expresan como ADDED. -->

## Impact

- Backend: `usuarios`, `reservas` y `pagos` (controllers, services, DTOs y tests
  unitarios).
- API: cinco endpoints y el contrato de `POST /notifications`.
- Base de datos: sin migraciones ni tablas nuevas; se reutilizan `usuarios`,
  `detalle_alquiler_equipamiento`, `reservas` y `registros_auditoria`.
- Frontend: sin cambios previstos; los contratos se alinean con las pantallas
  existentes.

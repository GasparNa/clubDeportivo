## Context

Ver `proposal.md` para la motivación. El estado actual relevante es:

- `backend/src/usuarios/usuarios.controller.ts` expone listado y cambio de
  estado, pero no `GET users/:id`.
- `backend/src/reservas/reservas.controller.ts` ya expone
  `PATCH equipment-rentals/:id/return`; falta únicamente el `GET` de detalle.
- `backend/src/pagos/pagos.controller.ts` ya expone `POST notifications`, pero
  espera `tipo` y no `asunto`; no existe `GET notifications`.
- `registros_auditoria.detalle` es JSON y hoy guarda `email`, `mensaje` y
  `enviado_en` para notificaciones. No hay tabla de notificaciones ni estado de
  lectura.
- El JWT resuelto por `JwtStrategy` deja `req.user.id_usuario` y `req.user.rol`.
  Los controladores usan `AuthGuard('jwt')` y `RolesGuard`.
- `ValidationPipe` global usa `whitelist: true` y `forbidNonWhitelisted: true`;
  los DTOs deben declarar todos los campos aceptados.
- `openspec/specs/` está vacío, por lo que los deltas de este change son
  `ADDED` aunque sus paths coincidan con capabilities de
  `club-deportivo-reservas`.

## Goals / Non-Goals

**Goals:**

- Agregar los tres endpoints `GET` faltantes con contratos planos compatibles
  con las pantallas existentes.
- Resolver la titularidad y el alcance por rol en el backend, nunca a partir de
  un identificador enviado por el cliente.
- Reutilizar `registros_auditoria` para la bandeja y el envío simulado de
  notificaciones, sin migraciones.
- Cubrir cada endpoint con tests unitarios de servicio y controlador,
  incluyendo errores `400`, `401`, `403` y `404`.

**Non-Goals:**

- No enviar emails reales ni integrar un proveedor externo.
- No persistir estado de lectura (`leida`) ni agregar paginación; la bandeja se
  limita a las 100 notificaciones más recientes.
- No crear tablas, columnas ni migraciones de Prisma.
- No modificar el endpoint de devolución ni el flujo de stock.
- No rediseñar pantallas del frontend.

## Decisions

### Respuestas planas construidas en el servicio

Los métodos nuevos devolverán objetos explícitos en lugar de modelos Prisma con
`include`. Para usuarios se mapearán persona, contactos y usuario a los campos
que consume `frontend/src/app/admin/users/[id]/page.tsx`; para alquileres se
mapearán detalle y equipamiento a la forma que normaliza `normalizeAlquiler`; para
notificaciones se mapeará `registroAuditoria` a `id`, `titulo`, `mensaje`,
`tipo`, `leida` y `creado_en`.

Alternativa descartada: devolver el modelo Prisma completo. Expone
`password_hash`/relaciones internas y obliga al frontend a conocer la forma de la
base.

### Listado de usuarios reutilizando el mapeo de RF-USR-01

`GET /users` reutilizará el mismo mapeo plano de RF-USR-01 para cada elemento del
listado, de modo que `GET /users` y `GET /users/:id` compartan campos y reglas de
contactos activos. El listado mantendrá los filtros `rol` y `estado` y seguirá
restringido a `ADMINISTRADOR`; quitará el `include` anidado actual para no
exponer `password_hash`, `id_contacto_login` ni relaciones.

Alternativa descartada: mantener la forma anidada actual del listado. La pantalla
de administración espera campos planos y la respuesta filtraría credenciales.

### Filtros de titularidad en el servicio, no en el controlador

El controlador pasará `req.user` a los métodos de reservas. El servicio resolverá
si el actor es `ADMINISTRADOR`/`GERENTE` o `SOCIO` y comparará
`reserva.id_persona` con `req.user.id_usuario`. Para el listado, el `where` de
Prisma incluirá la relación `reserva.id_persona` cuando el actor sea `SOCIO`. Un
`reservation_id` explícito de otra persona devolverá `403` antes de consultar
detalles.

Alternativa descartada: confiar en `person_id` o `reservation_id` enviados por el
cliente. Permitiría enumerar alquileres ajenos.

### Notificaciones derivadas de auditoría

`GET /notifications` consultará `registroAuditoria` por
`id_usuario = req.user.id_usuario`, `entidad = 'notificaciones'` y
`evento.startsWith('NOTIFICACION_')`, con orden `fecha: 'desc'` y `take: 100`.
El tipo se obtendrá del sufijo del evento y se normalizará a `INFO` si no es uno
de los cuatro valores conocidos. El título usará `detalle.asunto` y caerá a
`Notificación` para registros históricos. `leida` será siempre `false`.

Alternativa descartada: crear una tabla `notificaciones`. Requiere migración,
backfill y un modelo de lectura que el alcance actual no pide; además rompe la
restricción de no modificar el esquema.

### DTO de envío y compatibilidad del contrato

Se agregará un DTO con `id_usuario` UUID, `asunto` no vacío, `mensaje` no vacío y
`tipo` opcional enumerado. El servicio seguirá registrando en auditoría, pero
guardará `asunto` dentro de `detalle` y usará `tipo ?? 'INFO'` para el sufijo del
evento. La respuesta seguirá siendo la confirmación simulada con `message`,
`email` y `tipo`.

Alternativa descartada: mantener el body inline y renombrar `tipo` a `asunto` en
el controlador. No valida longitudes ni tipos y deja el contrato sin documentar.

### Mensajes de error estables

Se conservarán los mensajes ya usados por los servicios (`Usuario no
encontrado`, `Detalle de alquiler no encontrado`) y se agregará
`No puedes consultar alquileres de otro usuario` para el `403` de titularidad.
Los IDs de ruta se validarán con `ParseUUIDPipe` para obtener `400` antes de
llegar al servicio.

## Risks / Trade-offs

- [Sin estado de lectura, todas las notificaciones aparecen como no leídas] →
  Documentarlo como comportamiento de esta fase; la persistencia de lectura
  queda para un change posterior.
- [La bandeja deriva de auditoría y puede crecer sin paginación] → Se devuelven
  como máximo las 100 notificaciones más recientes, con el límite explícito en
  el contrato; si se necesita el historial completo, evaluar paginación en un
  change posterior.
- [`GET /users` cambia de una forma anidada a una lista plana] → Es un cambio
  incompatible de contrato intencional; se reutiliza el mapeo de RF-USR-01 y se
  cubre con tests que verifican la ausencia de `password_hash`.
- [El esquema de `Equipamiento` no tiene `descripcion`; la pantalla la muestra
  solo si existe] → No inventar el campo ni migrar; la respuesta incluye nombre y
  precio, y la UI usa su fallback.
- [El alcance por rol del listado de alquileres es un cambio incompatible para
  socios que antes veían todo] → Es una corrección de privacidad intencional;
  cubrirla con tests y marcarla **BREAKING** en el proposal/spec.
- [Clientes existentes que envían `tipo` sin `asunto` dejarán de ser válidos] →
  No hay consumidores conocidos además del frontend actual; validar el nuevo
  contrato con tests.

## Migration Plan

No hay migración de base de datos. El despliegue consiste en publicar una nueva
imagen del backend y reiniciar el servicio. Los registros históricos de
notificaciones siguen siendo legibles por el fallback de título. Rollback:
volver a la imagen anterior; no hay datos nuevos que revertir, salvo los
registros de auditoría append-only creados por los envíos, que son inocuos.


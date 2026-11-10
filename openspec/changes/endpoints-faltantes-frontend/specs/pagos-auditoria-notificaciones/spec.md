## Purpose

Ofrecer una bandeja de notificaciones por usuario derivada del registro de
auditoría y permitir que gerencia envíe notificaciones simuladas compatibles con
el contrato que consume el frontend, sin crear una tabla nueva.

## ADDED Requirements

### Requirement: RF-NOT-01 Bandeja de notificaciones del usuario autenticado

El sistema SHALL exponer `GET /api/v1/notifications` para cualquier usuario
autenticado. La respuesta SHALL ser una lista de notificaciones del usuario
identificado por el token, ordenadas de más reciente a más antigua, donde cada
elemento incluya `id`, `titulo`, `mensaje`, `tipo`, `leida` y `creado_en`. La
respuesta SHALL incluir como máximo las 100 notificaciones más recientes.

Las notificaciones SHALL derivarse de los registros de `registros_auditoria`
cuyo `id_usuario` sea el usuario autenticado, cuyo `evento` comience con
`NOTIFICACION_` y cuya `entidad` sea `notificaciones`. `id` SHALL ser el
`id_registro`; `creado_en` SHALL ser `fecha`;
`mensaje` SHALL ser `detalle.mensaje`; `titulo` SHALL ser `detalle.asunto` y,
si no existe o está vacío, SHALL ser `Notificación`; `tipo` SHALL ser el sufijo
del evento cuando sea `INFO`, `WARNING`, `ERROR` o `SUCCESS`, y `INFO` para
cualquier otro valor. `leida` SHALL ser `false` mientras no exista estado de
lectura persistido.

El sistema SHALL devolver `200` con una lista vacía cuando el usuario no tenga
notificaciones. NO SHALL exponer notificaciones de otros usuarios. Una solicitud
sin token JWT válido SHALL producir `401`.

#### Scenario: Usuario con notificaciones propias

- **WHEN** un usuario autenticado solicita `GET /api/v1/notifications`
- **THEN** el sistema responde `200` con sus notificaciones ordenadas por fecha descendente
- **AND** cada notificación incluye `titulo`, `mensaje`, `tipo`, `leida` y `creado_en`

#### Scenario: Límite de 100 notificaciones

- **WHEN** un usuario autenticado tiene más de 100 registros `NOTIFICACION_*` con entidad `notificaciones`
- **THEN** el sistema responde `200` con las 100 notificaciones más recientes y no con el total histórico

#### Scenario: Usuario sin notificaciones

- **WHEN** un usuario autenticado sin registros `NOTIFICACION_*` solicita `GET /api/v1/notifications`
- **THEN** el sistema responde `200` con una lista vacía

#### Scenario: Notificaciones de otro usuario

- **WHEN** existen registros `NOTIFICACION_*` asociados a otro `id_usuario`
- **THEN** esos registros no aparecen en la respuesta del usuario autenticado

#### Scenario: Tipo de notificación desconocido

- **WHEN** un registro tiene un evento `NOTIFICACION_*` cuyo sufijo no es `INFO`, `WARNING`, `ERROR` ni `SUCCESS`
- **THEN** la notificación se devuelve con `tipo` igual a `INFO`

#### Scenario: Notificación heredada sin asunto

- **WHEN** un registro `NOTIFICACION_*` no contiene `detalle.asunto`
- **THEN** la notificación se devuelve con `titulo` igual a `Notificación`

#### Scenario: Solicitud sin autenticación

- **WHEN** una solicitud a `GET /api/v1/notifications` no incluye un token JWT válido
- **THEN** el sistema responde `401`

### Requirement: RF-NOT-02 Envío manual simulado de notificaciones

Este requisito complementa el requisito vigente `Notificaciones del sistema` y
NO lo modifica ni lo reemplaza.

El sistema SHALL exponer `POST /api/v1/notifications` para usuarios con rol
`GERENTE` o `ADMINISTRADOR`. El cuerpo SHALL aceptar `id_usuario` como UUID,
`asunto` como cadena no vacía, `mensaje` como cadena no vacía y `tipo` opcional
con valor `INFO`, `WARNING`, `ERROR` o `SUCCESS`; si `tipo` no se envía SHALL
asumir `INFO`.

El envío SHALL seguir siendo simulado: NO SHALL enviar un email real. El
sistema SHALL registrar un evento `NOTIFICACION_<TIPO>` en
`registros_auditoria` con `id_usuario`, `entidad` igual a `notificaciones` y un
`detalle` que incluya `asunto`, `mensaje`, `email` y `enviado_en`. El `asunto`
registrado SHALL ser el `titulo` devuelto por RF-NOT-01.

El sistema SHALL responder `201` con un mensaje de confirmación, el email
resuelto y el tipo aplicado. Un `id_usuario` inexistente SHALL producir `404` con
el mensaje `Usuario no encontrado`. Un `asunto` o `mensaje` vacío, un `tipo`
fuera del conjunto permitido o un `id_usuario` que no sea UUID SHALL producir
`400`. Un usuario con rol `SOCIO` SHALL recibir `403`. Una solicitud sin token
JWT válido SHALL producir `401`.

#### Scenario: Gerencia envía una notificación válida

- **WHEN** un `GERENTE` o `ADMINISTRADOR` autenticado envía `id_usuario`, `asunto` y `mensaje` válidos
- **THEN** el sistema registra la notificación en auditoría y responde `201`
- **AND** el usuario destinatario puede verla mediante `GET /api/v1/notifications`

#### Scenario: Tipo omitido

- **WHEN** la solicitud no incluye `tipo`
- **THEN** el sistema registra el evento `NOTIFICACION_INFO` y responde con `tipo` igual a `INFO`

#### Scenario: Destinatario inexistente

- **WHEN** la solicitud usa un `id_usuario` que no corresponde a ningún usuario
- **THEN** el sistema responde `404` con el mensaje `Usuario no encontrado`

#### Scenario: Payload inválido

- **WHEN** la solicitud omite `asunto` o `mensaje`, los envía vacíos, usa un `tipo` inválido o un `id_usuario` que no es UUID
- **THEN** el sistema responde `400` sin registrar la notificación

#### Scenario: Socio intenta enviar una notificación

- **WHEN** un usuario autenticado con rol `SOCIO` solicita `POST /api/v1/notifications`
- **THEN** el sistema responde `403`

#### Scenario: Solicitud sin autenticación

- **WHEN** una solicitud a `POST /api/v1/notifications` no incluye un token JWT válido
- **THEN** el sistema responde `401`

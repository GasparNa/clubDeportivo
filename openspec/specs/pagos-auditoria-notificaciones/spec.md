# pagos-auditoria-notificaciones Specification

## Purpose
Gestión de pagos, auditoría y notificaciones para el sistema de reservas del club deportivo. Permite el seguimiento de pagos y actividades del sistema.

## Requirements

### Requirement: Seguimiento de pagos
The system SHALL allow tracking of payments associated with reservations and equipment rentals.

#### Scenario: Payment registration
- **WHEN** a payment is processed for a reservation or equipment rental
- **THEN** the system records the payment with amount, status, and timestamp

#### Scenario: Payment status check
- **WHEN** a user or administrator checks the payment status for a reservation
- **THEN** the system returns the current payment status (pending, completed, failed, refunded)

### Requirement: Auditoría de actividades del sistema
The system SHALL log all significant user actions and system events for audit purposes.

#### Scenario: User action logging
- **WHEN** a user performs a significant action (reservation, cancellation, payment)
- **THEN** the system logs the action with user ID, timestamp, and action type

#### Scenario: Audit report generation
- **WHEN** an administrator requests an audit report for a date range
- **THEN** the system returns a summary of all user actions and system events within that period

### Requirement: Notificaciones del sistema
The system SHALL send notifications to users about reservation changes and payment status.

#### Scenario: Reservation confirmation notification
- **WHEN** a reservation is successfully created
- **THEN** the system sends a confirmation notification to the user's registered email

#### Scenario: Payment completion notification
- **WHEN** a payment status changes to completed
- **THEN** the system sends a notification to the relevant parties (user, administrator)

#### Scenario: Reservation reminder notification
- **WHEN** a reservation is approaching its start time
- **THEN** the system sends a reminder notification to the user

### Requirement: Control de stock en tiempo real para equipamiento
The system SHALL validate stock availability in real-time for sports equipment rentals.

#### Scenario: Stock validation before rental
- **WHEN** a user requests equipment rental
- **THEN** the system checks available stock and rejects the rental if insufficient stock exists

#### Scenario: Stock update after return
- **WHEN** a user returns rented equipment
- **THEN** the system increments the equipment stock count and updates availability status

### Requirement: Usuarios suspendidos no pueden realizar reservas
The system SHALL prevent suspended users from creating any reservation or equipment rental.

#### Scenario: Blocked suspended user reservation
- **WHEN** a suspended user attempts to create a reservation
- **THEN** the system rejects the reservation request and returns an error indicating the user is suspended

#### Scenario: Blocked suspended user equipment rental
- **WHEN** a suspended user attempts to rent equipment
- **THEN** the system rejects the rental request and returns an error indicating the user is suspended

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

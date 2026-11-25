## ADDED Requirements

### Requirement: RF-PAG-06 Titularidad en el listado de pagos

El sistema SHALL devolver en `GET /api/v1/payments` únicamente los pagos cuyo titular sea el usuario autenticado cuando su rol sea `SOCIO`. El titular de un pago SHALL ser el socio titular de la reserva asociada: `crearPago` copia `reserva.id_persona` en `registroAuditoria.id_usuario`, por lo que ese campo identifica al socio y NO al `GERENTE`/`ADMINISTRADOR` que registró el pago. El sistema SHALL filtrar el listado por `registroAuditoria.id_usuario`. El sistema SHALL devolver todos los pagos que coincidan con los filtros de fecha cuando el rol sea `GERENTE` o `ADMINISTRADOR`. Una solicitud sin token JWT válido SHALL responder `401`. Los filtros `date_from` y `date_to` SHALL aplicarse sobre el conjunto autorizado.

#### Scenario: Socio lista sus propios pagos

- **WHEN** el socio `usr-a` solicita `GET /api/v1/payments` y existen pagos de `usr-a` y de `usr-b`
- **THEN** el sistema responde `200` únicamente con los pagos de `usr-a`

#### Scenario: Gerencia registra un pago a nombre del socio

- **WHEN** el gerente `usr-g` registra un pago para la reserva `res-123`, titularizada por `usr-a`
- **THEN** el registro queda con `id_usuario = usr-a`, no `usr-g`
- **AND** `usr-a` ve ese pago en `GET /api/v1/payments` y `usr-b` no lo ve

#### Scenario: Gerencia lista todos los pagos

- **WHEN** un usuario con rol `GERENTE` o `ADMINISTRADOR` solicita `GET /api/v1/payments`
- **THEN** el sistema responde `200` con los pagos de todos los socios

#### Scenario: Socio aplica filtros de fecha

- **WHEN** el socio `usr-a` solicita `GET /api/v1/payments?date_from=2026-01-01&date_to=2026-01-31`
- **THEN** el sistema responde `200` únicamente con sus pagos dentro de ese rango

#### Scenario: Listado sin autenticación

- **WHEN** una solicitud a `GET /api/v1/payments` no incluye un token JWT válido
- **THEN** el sistema responde `401`

### Requirement: RF-PAG-07 Titularidad en los pagos de una reserva

El sistema SHALL devolver en `GET /api/v1/payments/reservation/:id` los pagos de la reserva solicitada al usuario autenticado si `reserva.id_persona` coincide con `actor.id_usuario` —criterio distinto del `registroAuditoria.id_usuario` usado por `RF-PAG-06`— o si su rol es `GERENTE` o `ADMINISTRADOR`. Cuando un `SOCIO` solicite los pagos de una reserva ajena, el sistema SHALL responder `404 Reserva no encontrada`. Una reserva inexistente SHALL responder `404` y una solicitud sin token JWT válido SHALL responder `401`.

#### Scenario: Socio consulta los pagos de su reserva

- **WHEN** el socio `usr-a` solicita `GET /api/v1/payments/reservation/res-123` y `res-123` le pertenece
- **THEN** el sistema responde `200` con los pagos de `res-123`

#### Scenario: Socio consulta los pagos de una reserva ajena

- **WHEN** el socio `usr-a` solicita `GET /api/v1/payments/reservation/res-456` y `res-456` pertenece a `usr-b`
- **THEN** el sistema responde `404` con el mensaje `Reserva no encontrada`
- **AND** la respuesta no incluye importes ni registros de pago de `usr-b`

#### Scenario: Gerencia consulta los pagos de una reserva ajena

- **WHEN** un usuario con rol `GERENTE` o `ADMINISTRADOR` solicita `GET /api/v1/payments/reservation/res-456` perteneciente a `usr-b`
- **THEN** el sistema responde `200` con los pagos de `res-456`

#### Scenario: Reserva inexistente

- **WHEN** cualquier usuario autenticado solicita `GET /api/v1/payments/reservation/res-999` y esa reserva no existe
- **THEN** el sistema responde `404` con el mensaje `Reserva no encontrada`

#### Scenario: Consulta sin autenticación

- **WHEN** una solicitud a `GET /api/v1/payments/reservation/res-123` no incluye un token JWT válido
- **THEN** el sistema responde `401`

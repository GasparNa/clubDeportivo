## ADDED Requirements

### Requirement: RF-RES-08 Titularidad en el listado de reservas

El sistema SHALL devolver en `GET /api/v1/reservations` únicamente las reservas pertenecientes al usuario autenticado cuando su rol sea `SOCIO`. En particular, si el `SOCIO` omite el parámetro `person_id`, el sistema SHALL devolver solo sus propias reservas, nunca el listado completo. El sistema SHALL devolver todas las reservas que coincidan con los filtros cuando el rol sea `GERENTE` o `ADMINISTRADOR`. Un `SOCIO` que envíe el parámetro `person_id` con un identificador distinto al suyo SHALL recibir `403`. Una solicitud sin token JWT válido SHALL recibir `401`. Los filtros `date` y `status` SHALL seguir aplicándose sobre el conjunto autorizado.

#### Scenario: Socio omite `person_id` y ve solo sus reservas

- **WHEN** el socio `usr-a` solicita `GET /api/v1/reservations` sin parámetros y existen reservas de `usr-a` y de `usr-b`
- **THEN** el sistema responde `200` con las reservas de `usr-a`
- **AND** la respuesta no contiene reservas de `usr-b`
- **AND** la respuesta no es el listado completo de reservas

#### Scenario: Socio intenta forzar el filtro por otra persona

- **WHEN** el socio `usr-a` solicita `GET /api/v1/reservations?person_id=usr-b`
- **THEN** el sistema responde `403`
- **AND** la respuesta no contiene datos de reservas de `usr-b`

#### Scenario: Gerencia lista todas las reservas

- **WHEN** un usuario con rol `GERENTE` o `ADMINISTRADOR` solicita `GET /api/v1/reservations?status=CONFIRMADA`
- **THEN** el sistema responde `200` con las reservas `CONFIRMADA` de todos los socios

#### Scenario: Socio combina filtros sobre sus propias reservas

- **WHEN** el socio `usr-a` solicita `GET /api/v1/reservations?person_id=usr-a&status=CANCELADA`
- **THEN** el sistema responde `200` únicamente con sus reservas `CANCELADA`

#### Scenario: Listado sin autenticación

- **WHEN** una solicitud a `GET /api/v1/reservations` no incluye un token JWT válido
- **THEN** el sistema responde `401`

### Requirement: RF-RES-09 Titularidad en el detalle de reservas

El sistema SHALL devolver en `GET /api/v1/reservations/:id` la reserva solicitada al usuario autenticado si es suya o si su rol es `GERENTE` o `ADMINISTRADOR`. Cuando un `SOCIO` solicite una reserva de otro usuario, el sistema SHALL responder `404 Reserva no encontrada`, sin revelar si el identificador existe. Una solicitud sin token JWT válido SHALL responder `401`.

#### Scenario: Socio consulta su propia reserva

- **WHEN** el socio `usr-a` solicita `GET /api/v1/reservations/res-123` y `res-123` pertenece a `usr-a`
- **THEN** el sistema responde `200` con el detalle de `res-123`

#### Scenario: Socio consulta una reserva ajena

- **WHEN** el socio `usr-a` solicita `GET /api/v1/reservations/res-456` y `res-456` pertenece a `usr-b`
- **THEN** el sistema responde `404` con el mensaje `Reserva no encontrada`

#### Scenario: Gerencia consulta una reserva ajena

- **WHEN** un usuario con rol `GERENTE` o `ADMINISTRADOR` solicita `GET /api/v1/reservations/res-456` perteneciente a `usr-b`
- **THEN** el sistema responde `200` con el detalle de `res-456`

#### Scenario: Reserva inexistente

- **WHEN** cualquier usuario autenticado solicita `GET /api/v1/reservations/res-999` y ese identificador no existe
- **THEN** el sistema responde `404` con el mensaje `Reserva no encontrada`

#### Scenario: Detalle sin autenticación

- **WHEN** una solicitud a `GET /api/v1/reservations/res-123` no incluye un token JWT válido
- **THEN** el sistema responde `401`

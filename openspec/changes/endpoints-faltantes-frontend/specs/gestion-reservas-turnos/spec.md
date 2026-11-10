## Purpose

Permitir la consulta individual de un alquiler de equipamiento para registrar su
devolución y asegurar que cada socio solo pueda ver los alquileres vinculados a
sus propias reservas.

## ADDED Requirements

### Requirement: RF-ALQ-01 Consulta de alquileres de equipamiento

El sistema SHALL exponer `GET /api/v1/equipment-rentals/:id` para usuarios
autenticados. La respuesta SHALL incluir `id_detalle`, `id_reserva`,
`id_equipamiento`, `cantidad`, `precio_unitario`, `subtotal`,
`estado_devolucion`, `creado_en` y un objeto `equipamiento` con al menos
`id_equipamiento`, `nombre` y `precio_alquiler`.

Un usuario con rol `ADMINISTRADOR` o `GERENTE` SHALL poder consultar cualquier
alquiler. Un usuario con rol `SOCIO` SHALL poder consultar únicamente alquileres
cuyo `id_reserva` pertenezca a una reserva con `id_persona` igual a su propio
`id_usuario`; en caso contrario el sistema SHALL responder `403` con el mensaje
`No puedes consultar alquileres de otro usuario`. Un alquiler inexistente SHALL
producir `404` con el mensaje `Detalle de alquiler no encontrado`. Un
identificador que no sea UUID SHALL producir `400`.

**BREAKING**: `GET /api/v1/equipment-rentals` SHALL aplicar el mismo alcance por
rol. Un `SOCIO` SHALL recibir solo los alquileres de sus propias reservas,
incluso cuando no envíe `reservation_id`. Si un `SOCIO` envía un
`reservation_id` que pertenece a otra persona, el sistema SHALL responder `403`
con el mensaje `No puedes consultar alquileres de otro usuario`. `GERENTE` y
`ADMINISTRADOR` SHALL seguir viendo todos los alquileres y podrán filtrar por
`reservation_id`.

#### Scenario: Administrador consulta un alquiler existente

- **WHEN** un `ADMINISTRADOR` o `GERENTE` autenticado solicita `GET /api/v1/equipment-rentals/:id`
- **THEN** el sistema responde `200` con el detalle del alquiler y su equipamiento

#### Scenario: Socio consulta su propio alquiler

- **WHEN** un `SOCIO` autenticado solicita el detalle de un alquiler vinculado a una reserva propia
- **THEN** el sistema responde `200` con el detalle del alquiler

#### Scenario: Socio intenta consultar un alquiler ajeno

- **WHEN** un `SOCIO` autenticado solicita el detalle de un alquiler vinculado a una reserva de otra persona
- **THEN** el sistema responde `403` con el mensaje `No puedes consultar alquileres de otro usuario`

#### Scenario: Alquiler inexistente

- **WHEN** un usuario autorizado solicita el detalle de un UUID que no corresponde a ningún alquiler
- **THEN** el sistema responde `404` con el mensaje `Detalle de alquiler no encontrado`

#### Scenario: Identificador con formato inválido

- **WHEN** un usuario autenticado solicita `GET /api/v1/equipment-rentals/:id` con un valor que no es UUID
- **THEN** el sistema responde `400`

#### Scenario: Solicitudes sin autenticación

- **WHEN** se solicita `GET /api/v1/equipment-rentals` o `GET /api/v1/equipment-rentals/:id` sin un token JWT válido
- **THEN** el sistema responde `401`

#### Scenario: Socio lista solo sus alquileres

- **WHEN** un `SOCIO` autenticado solicita `GET /api/v1/equipment-rentals` sin filtro
- **THEN** el sistema responde `200` únicamente con alquileres de reservas propias

#### Scenario: Socio filtra por una reserva ajena

- **WHEN** un `SOCIO` autenticado solicita `GET /api/v1/equipment-rentals?reservation_id=<reserva ajena>`
- **THEN** el sistema responde `403` con el mensaje `No puedes consultar alquileres de otro usuario`

#### Scenario: Gerencia lista todos los alquileres

- **WHEN** un `ADMINISTRADOR` o `GERENTE` solicita `GET /api/v1/equipment-rentals`
- **THEN** el sistema responde `200` con alquileres de todas las reservas

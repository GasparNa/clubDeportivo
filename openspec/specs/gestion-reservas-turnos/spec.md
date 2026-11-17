# gestion-reservas-turnos Specification

## Purpose
Gestión de reservas y turnos para el sistema de reservas del club deportivo. Permite la creación de reservas principales y alquiler de equipamiento deportivo.

## Requirements

### Requirement: Creación de reservas principales
The system SHALL allow registered users to create court reservations.

#### Scenario: Successful court reservation
- **WHEN** an authenticated user submits a reservation request with court ID, time slot ID, and user ID
- **THEN** the system creates the reservation and confirms the booking

#### Scenario: Reservation conflict detection
- **WHEN** a user attempts to reserve a court during an already booked time slot
- **THEN** the system rejects the reservation and returns an error indicating the conflict

### Requirement: Alquiler de equipamiento deportivo
The system SHALL allow users to rent sports equipment associated with reservations.

#### Scenario: Equipment rental request
- **WHEN** a user requests equipment rental for an existing reservation
- **THEN** the system creates the equipment rental and associates it with the reservation

#### Scenario: Equipment return processing
- **WHEN** a user returns rented equipment and marks the reservation as completed
- **THEN** the system updates the equipment status and marks the reservation as returned

### Requirement: Gestión de turnos y franjas
The system SHALL allow management of reservation time slots and turnover between bookings.

#### Scenario: Time slot turnover
- **WHEN** a reservation ends and the system checks the next available time slot
- **THEN** the system marks the court as available for the next reservation

#### Scenario: Extended reservation handling
- **WHEN** a user requests to extend an existing reservation
- **THEN** the system validates availability and either extends or proposes alternative time slots

### Requirement: Validación XOR de propietario de reserva
El sistema SHALL garantizar que cada reserva pertenezca exactamente a una `Persona` que sea a su vez un `Usuario` registrado con `estado = 'ACTIVO'`. No se admiten reservas para personas sin cuenta de usuario ni para usuarios en estado PENDIENTE, SUSPENDIDO o INACTIVO.

#### Scenario: Reservation ownership validation
- **WHEN** una reserva se verifica para determinar su titularidad
- **THEN** el sistema comprueba que la reserva pertenece a una `Persona` que es un `Usuario` con estado ACTIVO y concede o deniega el acceso en consecuencia

#### Scenario: Inhibit dual ownership
- **WHEN** un intento del sistema crea una reserva con más de un propietario o para una persona sin usuario activo
- **THEN** el sistema rechaza la reserva con un error que indica el incumplimiento de la regla de propietario único activo

#### Scenario: Crear reserva con usuario activo
- **WHEN** un usuario autenticado con rol SOCIO y estado ACTIVO solicita crear una reserva
- **THEN** el sistema permite la creación de la reserva

#### Scenario: Rechazar reserva para persona sin cuenta
- **WHEN** se intenta crear una reserva con un `id_persona` que no existe en la tabla `usuarios`
- **THEN** el sistema rechaza la operación con error "Solo usuarios registrados y activos pueden reservar"

#### Scenario: Rechazar reserva para usuario no activo
- **WHEN** se intenta crear una reserva con un `id_persona` cuyo usuario tiene estado PENDIENTE, SUSPENDIDO o INACTIVO
- **THEN** el sistema rechaza la operación con error "El usuario debe estar ACTIVO para reservar"

#### Scenario: Rechazar reserva MANUAL_GERENCIA para persona sin cuenta
- **WHEN** un gerente o administrador intenta crear una reserva con origen MANUAL_GERENCIA para una persona sin usuario activo
- **THEN** el sistema rechaza la operación con error "Solo usuarios registrados y activos pueden reservar"

### Requirement: Cancelación autogestionada de reservas
The system SHALL allow a Socio to cancel their own reservation through a dedicated endpoint (`DELETE /api/v1/reservations/:id`), requiring the reservation to be `CONFIRMADA` and owned by the requesting user. The system SHALL reject the cancellation with `403 Forbidden` when the reservation belongs to another user, and SHALL enforce the existing 24-hour advance notice policy for AUTOGESTIONADA reservations.

#### Scenario: Socio cancela su propia reserva con anticipación
- **WHEN** a Socio requests cancellation of a `CONFIRMADA` reservation he owns, with more than 24 hours before the time slot starts
- **THEN** the system transitions the reservation to `CANCELADA`, records `cancelado_en` and confirms the operation

#### Scenario: Intentar cancelar la reserva de otro usuario
- **WHEN** a Socio requests cancellation of a reservation that belongs to a different user
- **THEN** the system rejects the operation with `403 Forbidden` and the reservation remains unchanged

#### Scenario: Cancelación sin anticipación suficiente
- **WHEN** a Socio requests cancellation of his own reservation with less than 24 hours before the time slot starts
- **THEN** the system rejects the operation with a validation error and the reservation remains `CONFIRMADA`

#### Scenario: Cancelar una reserva no confirmada
- **WHEN** a Socio requests cancellation of a reservation whose state is not `CONFIRMADA`
- **THEN** the system rejects the operation with a validation error and the reservation state does not change

### Requirement: Límite de dos reservas confirmadas por usuario activo
El sistema SHALL permitir un máximo de 2 reservas con estado `CONFIRMADA` simultáneas por cada usuario con estado ACTIVO.

#### Scenario: Permitir primera y segunda reserva
- **WHEN** un usuario ACTIVO crea su primera o segunda reserva CONFIRMADA
- **THEN** el sistema permite ambas reservas

#### Scenario: Rechazar tercera reserva confirmada
- **WHEN** un usuario ACTIVO con 2 reservas CONFIRMADA intenta crear una tercera
- **THEN** el sistema rechaza la operación con error "El usuario ya posee el máximo de 2 reservas confirmadas"

#### Scenario: Permitir tercera reserva si una se cancela
- **WHEN** un usuario ACTIVO con 2 reservas CONFIRMADA cancela una y luego intenta crear una nueva
- **THEN** el sistema permite la nueva reserva (el límite se evalúa en tiempo real)

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

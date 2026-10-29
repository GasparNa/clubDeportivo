## ADDED Requirements

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
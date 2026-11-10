# Spec Delta

## Purpose

Gestión de reservas y turnos para el sistema de reservas del club deportivo. Permite la creación de reservas principales y alquiler de equipamiento deportivo.

## ADDED Requirements

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
The system SHALL enforce that each reservation belongs exclusively to a socio or invitado (XOR), never both.

#### Scenario: Reservation ownership validation
- **WHEN** a reservation is checked for ownership
- **THEN** the system verifies the requester is either the socio or the invitado, but not both, and grants or denies access accordingly

#### Scenario: Inhibit dual ownership
- **WHEN** a system attempt creates a reservation with both socio and invitado assignees
- **THEN** the system rejects the reservation and returns an error indicating XOR constraint violation
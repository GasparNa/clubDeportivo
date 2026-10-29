# Spec Delta

## Purpose

Gestión de pagos, auditoría y notificaciones para el sistema de reservas del club deportivo. Permite el seguimiento de pagos y actividades del sistema.

## ADDED Requirements

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
# Spec Delta

## Purpose

Gestión de instalaciones y horarios para el sistema de reservas del club deportivo. Permite la gestión de disciplinas, canchas y franjas horarias disponibles.

## ADDED Requirements

### Requirement: Gestión de disciplinas
The system SHALL allow administrators to manage sports disciplines offered by the club.

#### Scenario: Create new discipline
- **WHEN** an administrator submits a new discipline name and description
- **THEN** the system creates the discipline and makes it available for court assignment

#### Scenario: List available disciplines
- **WHEN** a user requests available disciplines
- **THEN** the system returns a list of all registered sports disciplines

### Requirement: Gestión de canchas
The system SHALL allow administrators to manage sports courts associated with disciplines.

#### Scenario: Create new court
- **WHEN** an administrator submits court name, discipline ID, and capacity
- **THEN** the system creates the court and associates it with the specified discipline

#### Scenario: List courts by discipline
- **WHEN** a user requests courts for a specific discipline
- **THEN** the system returns all courts associated with that discipline

### Requirement: Gestión de franjas horarias
The system SHALL allow creation and management of time slots for court reservations.

#### Scenario: Create time slot
- **WHEN** an administrator creates a time slot with court ID, start time, and end time
- **THEN** the system validates availability and stores the time slot

#### Scenario: List available time slots
- **WHEN** a user requests available time slots for a specific court and date
- **THEN** the system returns all available time slots considering existing reservations

### Requirement: Disciplinas deportivas soportadas
The system SHALL support the following disciplines: Tenis, Fútbol, Pádel.

#### Scenario: Add discipline Tenis
- **WHEN** an administrator adds the "Tenis" discipline
- **THEN** the system creates the discipline and associates default tennis courts

#### Scenario: Add discipline Fútbol
- **WHEN** an administrator adds the "Fútbol" discipline
- **THEN** the system creates the discipline and associates default football fields

#### Scenario: Add discipline Pádel
- **WHEN** an administrator adds the "Pádel" discipline
- **THEN** the system creates the discipline and associates default paddle courts
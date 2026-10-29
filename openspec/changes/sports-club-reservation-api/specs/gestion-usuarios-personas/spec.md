# Spec Delta

## Purpose

Gestión de usuarios y personas para el sistema de reservas del club deportivo. Permite el registro, autenticación y perfil de socios y administradores.

## ADDED Requirements

### Requirement: Registro de usuarios
The system SHALL allow new users to register with valid email and password.

#### Scenario: Successful user registration
- **WHEN** a user provides valid name, email, and password
- **THEN** the system creates the user account and sends confirmation email

### Requirement: Autenticación de usuarios
The system SHALL authenticate registered users with valid credentials.

#### Scenario: Successful user login
- **WHEN** a user provides registered email and correct password
- **THEN** the system generates an authentication token and grants access

### Requirement: Recuperación de contraseña
The system SHALL allow users to recover their password using their registered email.

#### Scenario: Password recovery request
- **WHEN** a user requests password recovery with registered email
- **THEN** the system sends password reset instructions to the user's email

### Requirement: Perfil de usuario
The system SHALL allow authenticated users to view and update their profile information.

#### Scenario: View user profile
- **WHEN** an authenticated user requests their profile
- **THEN** the system returns the user's name, email, and role

#### Scenario: Update user profile
- **WHEN** an authenticated user submits updated profile data
- **THEN** the system updates the user profile and returns the updated information
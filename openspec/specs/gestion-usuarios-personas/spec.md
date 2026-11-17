# gestion-usuarios-personas Specification

## Purpose
Gestión de usuarios y personas para el sistema de reservas del club deportivo. Permite el registro, autenticación y perfil de socios y administradores.

## Requirements

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

### Requirement: Roles de usuario
The system SHALL assign and enforce user roles (socio, gerente, administrador, invitado) with appropriate permissions.

#### Scenario: Assign role to new user
- **WHEN** an administrator assigns a role to a new user
- **THEN** the system grants permissions according to the assigned role

#### Scenario: Role-based access control
- **WHEN** a user attempts an action outside their role permissions
- **THEN** the system rejects the action and returns an error indicating insufficient permissions

### Requirement: RF-USR-01 Detalle de usuario para administración

El sistema SHALL exponer `GET /api/v1/users/:id` para que un usuario con rol
`ADMINISTRADOR` consulte un usuario existente por su identificador.

La respuesta SHALL ser un objeto plano con los campos `id`, `id_usuario`,
`nombre`, `apellido`, `email`, `dni`, `cuil`, `fecha_nacimiento`, `telefono`,
`rol`, `estado`, `infracciones_equipamiento`, `creado_en` y `actualizado_en`.
`id` e `id_usuario` SHALL contener el mismo identificador. `email` SHALL
obtenerse del contacto `EMAIL` activo y `telefono` del contacto `TELEFONO`
activo; si no existen, `email` SHALL ser una cadena vacía y `telefono` SHALL ser
`null`. `infracciones_equipamiento` SHALL reflejar el valor persistido en la
columna `incumplimientos_equipamiento` de la tabla `usuarios`.

La respuesta NO SHALL incluir `password_hash`, `id_contacto_login` ni cualquier
otro dato interno de autenticación. Un identificador que no sea UUID SHALL
producir `400`. Un usuario inexistente SHALL producir `404` con el mensaje
`Usuario no encontrado`.

#### Scenario: Administrador consulta un usuario existente

- **WHEN** un `ADMINISTRADOR` autenticado solicita `GET /api/v1/users/:id` con el identificador de un usuario existente
- **THEN** el sistema responde `200` con los datos planos del usuario y sus contactos activos
- **AND** la respuesta no contiene `password_hash` ni `id_contacto_login`

#### Scenario: Rol sin permiso intenta consultar el detalle

- **WHEN** un usuario autenticado con rol `SOCIO` o `GERENTE` solicita `GET /api/v1/users/:id`
- **THEN** el sistema responde `403`

#### Scenario: Usuario inexistente

- **WHEN** un `ADMINISTRADOR` solicita el detalle de un UUID que no corresponde a ningún usuario
- **THEN** el sistema responde `404` con el mensaje `Usuario no encontrado`

#### Scenario: Identificador con formato inválido

- **WHEN** un `ADMINISTRADOR` solicita `GET /api/v1/users/:id` con un valor que no es UUID
- **THEN** el sistema responde `400`

#### Scenario: Solicitud sin autenticación

- **WHEN** una solicitud a `GET /api/v1/users/:id` no incluye un token JWT válido
- **THEN** el sistema responde `401`

### Requirement: RF-USR-02 Listado de usuarios plano y sin credenciales

El sistema SHALL exponer `GET /api/v1/users` para que un usuario con rol
`ADMINISTRADOR` obtenga el listado de usuarios. La respuesta SHALL ser una lista
de objetos planos con los mismos campos que RF-USR-01: `id`, `id_usuario`,
`nombre`, `apellido`, `email`, `dni`, `cuil`, `telefono`, `rol`, `estado` y
`creado_en`. `id` e `id_usuario` SHALL contener el mismo identificador. `email`
SHALL obtenerse del contacto `EMAIL` activo y `telefono` del contacto `TELEFONO`
activo; si no existen, `email` SHALL ser una cadena vacía y `telefono` SHALL ser
`null`.

Ningún elemento de la respuesta SHALL contener `password_hash`,
`id_contacto_login` ni relaciones anidadas. El listado SHALL mantener los filtros
`rol` y `estado`. Un usuario con rol `SOCIO` o `GERENTE` SHALL recibir `403`. Una
solicitud sin token JWT válido SHALL producir `401`.

#### Scenario: Administrador lista usuarios

- **WHEN** un `ADMINISTRADOR` autenticado solicita `GET /api/v1/users`
- **THEN** el sistema responde `200` con una lista de usuarios en forma plana
- **AND** ningún elemento contiene `password_hash`

#### Scenario: Filtro por rol

- **WHEN** un `ADMINISTRADOR` solicita `GET /api/v1/users?rol=SOCIO`
- **THEN** el sistema responde `200` únicamente con usuarios cuyo rol es `SOCIO`

#### Scenario: Rol sin permiso intenta listar usuarios

- **WHEN** un usuario autenticado con rol `SOCIO` o `GERENTE` solicita `GET /api/v1/users`
- **THEN** el sistema responde `403`

#### Scenario: Listado sin autenticación

- **WHEN** una solicitud a `GET /api/v1/users` no incluye un token JWT válido
- **THEN** el sistema responde `401`

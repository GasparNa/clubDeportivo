## Purpose

Garantiza que toda reserva en el sistema esté asociada exclusivamente a un usuario registrado con estado ACTIVO, eliminando la posibilidad de reservas para invitados sin cuenta.

## ADDED Requirements

### Requirement: Reserva requiere usuario activo
El sistema SHALL rechazar cualquier intento de crear una reserva si el `id_persona` proporcionado no tiene un registro correspondiente en la tabla `usuarios` con `estado = 'ACTIVO'`.

#### Scenario: Crear reserva con usuario activo
- **WHEN** un usuario autenticado con rol SOCIO y estado ACTIVO solicita crear una reserva
- **THEN** el sistema permite la creación de la reserva

#### Scenario: Rechazar reserva para invitado sin cuenta
- **WHEN** se intenta crear una reserva con un `id_persona` que no existe en la tabla `usuarios`
- **THEN** el sistema rechaza la operación con error "Solo usuarios registrados y activos pueden reservar"

#### Scenario: Rechazar reserva para usuario no activo
- **WHEN** se intenta crear una reserva con un `id_persona` cuyo usuario tiene estado PENDIENTE, SUSPENDIDO o INACTIVO
- **THEN** el sistema rechaza la operación con error "El usuario debe estar ACTIVO para reservar"

#### Scenario: Rechazar reserva MANUAL_GERENCIA para invitado
- **WHEN** un gerente o administrador intenta crear una reserva con origen MANUAL_GERENCIA para una persona sin usuario activo
- **THEN** el sistema rechaza la operación con error "Solo usuarios registrados y activos pueden reservar"

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
- **THEN** el sistema permite la nueva reserva (límite se evalúa en tiempo real)

## REMOVED Requirements

### Requirement: Reservas para invitados sin cuenta
**Reason**: Cambio de requisito de negocio - solo usuarios registrados y activos pueden reservar
**Migration**: Los invitados deben registrarse y ser aprobados (estado ACTIVO) antes de poder reservar. Gerentes ya no pueden crear reservas MANUAL_GERENCIA para personas sin cuenta.

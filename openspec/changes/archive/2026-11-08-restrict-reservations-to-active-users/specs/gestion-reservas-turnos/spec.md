## MODIFIED Requirements

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

## ADDED Requirements

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

## Purpose

Define la titularidad y el origen de las reservas según el rol del usuario autenticado: un SOCIO solo puede reservar a su propio nombre en modalidad autogestionada, mientras que GERENTE y ADMINISTRADOR pueden reservar en nombre de cualquier usuario ACTIVO y registrar reservas manuales de gerencia.

## ADDED Requirements

### Requirement: RF-RES-10 Titular y origen de la reserva según el rol
El sistema SHALL validar el titular y el origen de toda reserva contra el usuario autenticado que realiza la petición. Un SOCIO solo SHALL crear reservas a su propio nombre (`id_persona` igual al `id_usuario` del token u omitido, en cuyo caso la reserva queda a su nombre) y con origen `AUTOGESTIONADA`. GERENTE y ADMINISTRADOR conservan la facultad de indicar el `id_persona` de un usuario ACTIVO y el origen (`AUTOGESTIONADA` o `MANUAL_GERENCIA`). Las reglas vigentes de usuario ACTIVO, franja libre y límite de 2 reservas confirmadas SHALL seguir aplicando en todos los casos.

#### Scenario: SOCIO crea una reserva con su propio id_persona
- **WHEN** un SOCIO ACTIVO crea una reserva indicando su propio `id_persona`
- **THEN** el sistema responde 201 y crea la reserva a su nombre con origen `AUTOGESTIONADA`

#### Scenario: SOCIO crea una reserva sin id_persona
- **WHEN** un SOCIO ACTIVO crea una reserva sin indicar `id_persona`
- **THEN** el sistema responde 201 y la reserva queda a nombre del `id_usuario` del token

#### Scenario: SOCIO intenta reservar a nombre de otro usuario
- **WHEN** un SOCIO envía el `id_persona` de otro usuario
- **THEN** el sistema responde 403 con el error "No puedes crear reservas a nombre de otro usuario" y no consulta la base de datos ni crea ninguna reserva

#### Scenario: SOCIO intenta crear una reserva manual de gerencia
- **WHEN** un SOCIO envía origen `MANUAL_GERENCIA`
- **THEN** el sistema responde 403 con el error "Solo gerencia puede crear reservas manuales" y no consulta la base de datos ni crea ninguna reserva

#### Scenario: GERENTE crea una reserva manual para un socio activo
- **WHEN** un GERENTE crea una reserva con origen `MANUAL_GERENCIA` para un SOCIO ACTIVO
- **THEN** el sistema responde 201 y crea la reserva a nombre de ese socio

#### Scenario: GERENTE usa el id de un usuario no ACTIVO
- **WHEN** un GERENTE crea una reserva con el `id_persona` de un usuario que no está ACTIVO
- **THEN** el sistema responde 403 con el error vigente de usuario no activo

#### Scenario: GERENTE usa el id de una persona sin cuenta de usuario
- **WHEN** un GERENTE crea una reserva con el `id_persona` de una persona que no tiene registro en usuarios
- **THEN** el sistema responde 403 con el error "Solo usuarios registrados y activos pueden reservar"

#### Scenario: Petición sin token
- **WHEN** se intenta crear una reserva sin token de autenticación
- **THEN** el sistema responde 401 y no se consulta la base de datos ni se crea ninguna reserva

#### Scenario: Actor ausente o incompleto (fail-closed)
- **WHEN** la petición llega al proceso de creación sin un actor con `id_usuario` y rol verificables
- **THEN** el sistema responde 403 antes de realizar cualquier consulta a la base de datos

#### Scenario: Reglas vigentes siguen aplicando
- **WHEN** un SOCIO ACTIVO ya tiene 2 reservas `CONFIRMADA` e intenta crear otra a su nombre
- **THEN** el sistema responde con el error vigente del límite de 2 reservas confirmadas

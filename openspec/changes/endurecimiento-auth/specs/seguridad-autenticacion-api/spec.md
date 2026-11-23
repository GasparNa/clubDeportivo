## Purpose

Contratos de seguridad de la API del club: limitar los intentos de autenticación, exigir una configuración JWT segura desde el arranque y denegar por defecto cualquier autorización por rol que no pueda resolverse.

## ADDED Requirements

### Requirement: RF-AUT-01 Límite de intentos de autenticación

El sistema SHALL limitar las solicitudes a `POST /api/v1/auth/login` y `POST /api/v1/auth/register` a 10 intentos por minuto y dirección IP del cliente por defecto. El contador SHALL incluir tanto solicitudes con credenciales inválidas como exitosas. El límite SHALL ser configurable mediante variables de entorno con valores por defecto de 10 intentos y 60 segundos (`THROTTLE_LIMIT=10`, `THROTTLE_TTL=60000`). Al superarlo, el sistema SHALL responder `429 Too Many Requests`. `GET /api/v1/health` y cualquier otro endpoint NO SHALL estar sujeto a este límite. Detrás de un proxy inverso, el contador SHALL corresponder a la IP real del cliente y no a la del proxy.

#### Scenario: Intentos dentro del límite

- **WHEN** un cliente envía 9 solicitudes a `POST /api/v1/auth/login` desde la IP `203.0.113.10` en un minuto, algunas con credenciales inválidas y otras válidas
- **THEN** las solicitudes inválidas responden `401` y las válidas responden `200`
- **AND** ninguna respuesta es `429`

#### Scenario: Superar el límite en login

- **WHEN** un cliente envía una secuencia de 11 solicitudes a `POST /api/v1/auth/login` desde la IP `203.0.113.10` en el mismo minuto
- **THEN** las 10 primeras no responden `429`
- **AND** la undécima solicitud responde `429` sin ejecutar la verificación de credenciales

#### Scenario: Superar el límite en registro

- **WHEN** un cliente envía 11 solicitudes a `POST /api/v1/auth/register` desde la IP `203.0.113.11` en un minuto
- **THEN** la undécima solicitud responde `429`

#### Scenario: El health check no se limita

- **WHEN** un cliente envía más de 10 solicitudes a `GET /api/v1/health` en un minuto
- **THEN** todas las solicitudes responden `200` y ninguna responde `429`

#### Scenario: Clientes distintos detrás del proxy tienen contadores separados

- **WHEN** dos clientes con IPs reales `203.0.113.10` y `203.0.113.20` llegan a través del mismo proxy inverso y cada uno envía 9 solicitudes de login en un minuto
- **THEN** ambos reciben `401` y ninguno recibe `429`
- **AND** si el primero envía dos solicitudes adicionales, la décima sigue dentro del límite pero la undécima responde `429`, mientras el segundo continúa dentro del suyo

### Requirement: RF-AUT-02 Secreto JWT obligatorio y validado

El sistema SHALL obtener el secreto de firma y verificación de JWT de una única configuración centralizada. El sistema NO SHALL usar valores por defecto ni secretos de respaldo. El secreto SHALL ser obligatorio, tener al menos 32 caracteres y NO SHALL ser uno de los valores placeholder conocidos del repositorio. Si la configuración es inválida, el sistema SHALL impedir el arranque; en producción SHALL terminar el proceso emitiendo el mensaje JSON fatal de validación de entorno con `level: "fatal"`. Las suites de prueba SHALL definir un secreto de prueba de al menos 32 caracteres.

#### Scenario: Arranque con secreto válido

- **WHEN** el proceso arranca en producción con `JWT_SECRET` de 48 caracteres aleatorios y `DATABASE_URL` válida
- **THEN** el backend inicia normalmente y emite tokens JWT con ese secreto

#### Scenario: Falta el secreto en producción

- **WHEN** el proceso arranca en producción sin `JWT_SECRET`
- **THEN** el proceso termina con código 1
- **AND** escribe en stderr un JSON con `level: "fatal"` que menciona `JWT_SECRET`

#### Scenario: Secreto corto o placeholder

- **WHEN** el proceso arranca con `JWT_SECRET=dev-secret-change-me`, `JWT_SECRET=your-jwt-secret-change-me` o con un valor de 20 caracteres
- **THEN** el sistema rechaza la configuración aunque la variable esté presente
- **AND** en producción termina con el mismo mensaje JSON fatal que en el caso anterior

#### Scenario: Firma y verificación usan el mismo origen

- **WHEN** el backend emite un token y luego valida ese token en una solicitud autenticada
- **THEN** ambos usan el mismo secreto centralizado
- **AND** no existe una segunda configuración con valor por defecto que permita firma o verificación divergente

### Requirement: RF-AUT-03 Autorización por rol fail-closed

El sistema SHALL denegar con `403` cualquier solicitud a un endpoint con requisito de rol cuando el usuario autenticado no tenga un rol definido. A nivel de guardián, `canActivate` SHALL devolver `false` cuando falte el usuario o su rol; Nest SHALL traducir ese `false` en `403` si el guardián llega a evaluarse. A nivel HTTP, una solicitud sin token SHALL ser rechazada por `AuthGuard('jwt')` con `401` antes de que `RolesGuard` sea evaluado. Un endpoint sin requisito de rol NO SHALL ser afectado por este guardián.

#### Scenario: Endpoint sin requisito de rol

- **WHEN** una solicitud llega a un endpoint sin decorador de roles y no incluye usuario autenticado
- **THEN** el guardián permite el paso y la solicitud continúa

#### Scenario: Rol requerido coincide

- **WHEN** un usuario autenticado con rol `ADMINISTRADOR` solicita un endpoint que requiere `ADMINISTRADOR`
- **THEN** el guardián permite el paso y la solicitud continúa con `200`

#### Scenario: Rol distinto al requerido

- **WHEN** un usuario autenticado con rol `SOCIO` solicita un endpoint que requiere `ADMINISTRADOR`
- **THEN** el guardián deniega el paso y la respuesta es `403`

#### Scenario: Sin usuario autenticado (nivel guardián)

- **WHEN** se invoca `canActivate` de `RolesGuard` con un request que no tiene `user` hacia un endpoint que requiere `GERENTE`
- **THEN** el guardián devuelve `false` sin lanzar un error interno
- **AND** Nest traduciría ese `false` en `403` si el guardián llegara a evaluarse en la cadena HTTP

#### Scenario: Solicitud HTTP sin token

- **WHEN** una solicitud sin token JWT llega a un endpoint que requiere `GERENTE`
- **THEN** `AuthGuard('jwt')` responde `401`
- **AND** `RolesGuard` no se ejecuta

#### Scenario: Usuario sin rol

- **WHEN** una solicitud lleva un usuario autenticado cuyo campo de rol es `null` hacia un endpoint que requiere `ADMINISTRADOR`
- **THEN** `canActivate` devuelve `false` y la respuesta es `403`

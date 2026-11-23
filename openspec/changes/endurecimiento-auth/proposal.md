## Why

El backend permite intentos ilimitados de login y registro, reutiliza un secreto JWT con valor por defecto en dos archivos, y su `RolesGuard` falla con un error 500 cuando no hay usuario autenticado. Además, varios endpoints protegidos solo con `AuthGuard('jwt')` devuelven datos de todos los socios: un `SOCIO` puede consultar reservas, alquileres y pagos ajenos. El riesgo es concreto: fuerza bruta contra cuentas reales, tokens emitidos con una clave conocida y exposición de datos de terceros. Afecta a `SOCIO` (dueño de los datos), `GERENTE`/`ADMINISTRADOR` (guard de roles) y a quien despliega (arranque con configuración inválida).

Sí hace falta delta de spec: este change cambia comportamiento observable (nuevos `429`, `403`/`404`, alcance de los filtros y arranque fail-closed). Por eso NO se declara `skip_specs`.

## What Changes

- Agregar `@nestjs/throttler` y aplicar `@Throttle`/`ThrottlerGuard` **solo** a `POST /api/v1/auth/login` y `POST /api/v1/auth/register` (10 intentos/minuto por IP por defecto, configurable; exceso → `429`). `GET /api/v1/health` y el smoke test del CD quedan sin límite. El contador incluye tanto logins fallidos como exitosos.
- Configurar `trust proxy = 1` en Express para que el contador use la IP real reenviada por Caddy y no la IP del proxy.
- Eliminar el fallback `'default-secret-change-me'`, centralizar la lectura de `JWT_SECRET` y validarlo en el arranque (obligatorio, ≥32 caracteres, placeholders conocidos rechazados; en producción termina con el mensaje JSON fatal de `validarEntorno`).
- Hacer fail-closed `RolesGuard`: sin `user` o sin `user.rol` → `false` (`403` si se evaluara), con acceso seguro a las propiedades; a nivel HTTP el `AuthGuard('jwt')` responde `401` antes de que `RolesGuard` se ejecute.
- **BREAKING** Aplicar titularidad en los endpoints que hoy no filtran: un `SOCIO` solo ve/modifica lo propio; si el recurso es ajeno se responde `404` en consultas por identificador y `403` cuando el cliente intenta forzar un filtro ajeno. `GERENTE` y `ADMINISTRADOR` conservan acceso sin restricción.
- Agregar pruebas por escenario para cada corrección y regresiones para asignación masiva de `rol`/`estado` en `auth/register` y `PUT /profile`.
- Actualizar el lockfile raíz con pnpm 12.10.1 y dejar `pnpm install --frozen-lockfile` pasando.

Fuera de alcance: política de contraseñas, auditoría de eventos de auth, bloqueo de cuenta, refresh tokens, frontend, duración del token y workflows de GitHub.

## Capabilities

### New Capabilities

- `seguridad-autenticacion-api`: límites de intentos en endpoints de autenticación, configuración fail-closed del secreto JWT y autorización por rol fail-closed.

### Modified Capabilities

- `gestion-reservas-turnos`: titularidad en el listado y detalle de reservas.
- `pagos-auditoria-notificaciones`: titularidad en el listado de pagos y en los pagos de una reserva.

No se modifica `gestion-usuarios-personas`: `auth/register` y `PUT /profile` ya rechazan `rol`/`estado` (ver Hallazgos verificados), así que solo se agrega una prueba de regresión, no un requisito nuevo.

## Impact

- Backend: `src/auth/`, `src/main.ts`, `src/reservas/`, `src/pagos/`, `src/jest-setup.ts`, configuraciones de test y nuevos `*.spec.ts`. `backend/package.json`. Se crea `backend/test/jest-e2e.json` con `passWithNoTests: true`.
- Lockfile: **solo `pnpm-lock.yaml` de la raíz** del workspace. No existe `backend/pnpm-lock.yaml`; CI (`.github/workflows/ci.yml:47`) y `backend/Dockerfile:21-24` instalan desde la raíz.
- Configuración de entorno: `.env.example`, `backend/.env.example` y `docker-compose.yml` (secreto de desarrollo ≥32 caracteres). Los `.env` locales deben rotarse antes de arrancar.
- APIs: nuevas respuestas `429` y filtrado por titularidad en los endpoints listados. Sin cambios en el cuerpo de respuestas exitosas.
- Base de datos: ninguna migración; la titularidad se resuelve con datos ya persistidos (`reserva.id_persona`, `registroAuditoria.id_usuario`).
- Frontend, infraestructura, `.github/workflows/` y `Caddyfile`: sin cambios.

## Hallazgos verificados

Lectura directa del árbol de trabajo; ninguno de estos puntos se asumió.

### Parte 3 — RolesGuard

- `backend/src/auth/roles.guard.ts:11-21` — `requiredRoles` se obtiene bien, pero `:20` desestructura `user` del request y `:21` ejecuta `requiredRoles.includes(user.rol)`. Sin usuario autenticado hay `TypeError` (500), no un `403`. Veredicto: **NO fail-closed**; corregir y probar. A nivel HTTP, `AuthGuard('jwt')` responde `401` antes de este guardián.

### Parte 4 — Identidad del pagador (verificación adicional)

- `backend/prisma/schema.prisma:119-137` — no existe modelo ni tabla `pagos`; los pagos se registran como filas de `RegistroAuditoria` → `registros_auditoria`, con `id_usuario` FK a `Usuario` en `:123` y `:130`.
- `backend/src/pagos/pagos.service.ts:35-43` — `crearPago` declara explícitamente que no hay tabla de pagos y escribe `id_usuario: reserva.id_persona` en `:40`, sin recibir al `GERENTE`/`ADMINISTRADOR` que ejecuta el registro.
- `backend/prisma/schema.prisma:214,223` — `Reserva.id_persona` es el titular de la reserva.
- Veredicto: `registroAuditoria.id_usuario` identifica al **SOCIO titular**, NO a quien registró el pago. Por tanto `listarPagos` SÍ debe filtrar por `id_usuario`; `getPagosReserva` debe validar `reserva.id_persona`. No se usa una relación con la reserva para el listado.

### Parte 4 — Propiedad de los datos

- `GET /reservations` — `backend/src/reservas/reservas.controller.ts:35-47` no pasa `req.user`; `backend/src/reservas/reservas.service.ts:32-60` construye `where` solo con `person_id`, `date` y `estado` del query. Veredicto: **NO FILTRA**; corregir, inclusive cuando falte `person_id`.
- `GET /reservations/:id` — controlador `reservas.controller.ts:49-53` no pasa `req.user`; servicio `reservas.service.ts:65-95` hace `findUnique` solo por `id_reserva`. Veredicto: **NO FILTRA**; corregir.
- `GET /equipment-rentals` — controlador `reservas.controller.ts:111-118` pasa `req.user`; servicio `reservas.service.ts:347-373` aplica `where.reserva = { id_persona: actor.id_usuario }` a no gerencia y `:394-396` define `esGerencia`. Veredicto: **YA FILTRA**; no se modifica.
- `GET /equipment-rentals/:id` — controlador `reservas.controller.ts:120-124` pasa `req.user`; servicio `reservas.service.ts:317-341` rechaza con `403` en `:334-338` si no es gerencia y `id_persona` difiere. Veredicto: **YA FILTRA**; no se modifica.
- `GET /payments` — controlador `backend/src/pagos/pagos.controller.ts:36-43` no pasa `req.user`; servicio `backend/src/pagos/pagos.service.ts:97-112` filtra solo por fechas. Veredicto: **NO FILTRA**; corregir filtrando por `registroAuditoria.id_usuario` según el veredicto anterior.
- `GET /payments/reservation/:id` — controlador `pagos.controller.ts:45-49` no pasa `req.user`; servicio `pagos.service.ts:64-92` no recibe actor. Veredicto: **NO FILTRA**; corregir validando `reserva.id_persona`.
- `GET /notifications` — controlador `pagos.controller.ts:78-82` pasa `req.user.id_usuario`; servicio `pagos.service.ts:201-210` filtra `where.id_usuario`. Veredicto: **YA FILTRA**; no se modifica (bandeja personal del autenticado).
- `PATCH` y `DELETE /reservations/:id` — controlador `reservas.controller.ts:66-86` pasa `req.user?.id_usuario`; servicio `reservas.service.ts:234-249` compara `usuario.id_usuario !== reserva.id_persona` y devuelve `403`. Veredicto: **YA FILTRA**; no se modifica. Nota: gerencia/administrador también quedan restringidos aquí, pero `PATCH /reservations/:id/status` (`reservas.controller.ts:88-96`) ya les da la gestión con `RolesGuard`; se documenta para no romper ese contrato.

### Parte 4 — Asignación masiva

- `PUT /profile` — DTO `backend/src/usuarios/dto/usuarios.dto.ts:48-68` solo expone `nombre`, `apellido`, `email`, `telefono`; servicio `backend/src/usuarios/usuarios.service.ts:228-295` escribe solo esos campos; `main.ts:87-93` aplica `whitelist: true, forbidNonWhitelisted: true`. Veredicto: **NO ACEPTA** `rol`/`estado`; agregar prueba de regresión.
- `POST /auth/register` — DTO `usuarios.dto.ts:3-38` no declara `rol`/`estado`; servicio `usuarios.service.ts:91-99` fija `rol: 'SOCIO'` y `estado: 'PENDIENTE'` en la creación. Veredicto: **NO ACEPTA** `rol`/`estado`; agregar prueba de regresión.

### Contexto adicional verificado

- `backend/src/auth/auth.module.ts:10` y `backend/src/auth/jwt.strategy.ts:12` repiten `process.env.JWT_SECRET || 'default-secret-change-me'`. `backend/src/main.ts:26-27` solo verifica **presencia** en producción, sin longitud ni placeholders.
- `backend/src/main.ts` no configura `trust proxy`; `Caddyfile:33` envía `X-Forwarded-For: {remote_host}` en un único salto.
- `.env.example:15` (`dev-secret-change-me`), `backend/.env.example:14` (`your-jwt-secret-change-me`) y `docker-compose.yml:36` (mismo valor que el primero) son secretos cortos; `.env.prod.example:18` usa un placeholder de 57 caracteres que también debe rechazarse.
- `git grep -n "ci-placeholder" -- .github docker-compose*.yml backend` → `.github/workflows/ci.yml:66` (`POSTGRES_PASSWORD`) y `:67` (`JWT_SECRET`). El step `:64-68` solo ejecuta `docker compose -f docker-compose.prod.yml config -q`, sin arrancar contenedores. Ningún workflow arranca el backend con ese valor. Quien sí arranca backend con un valor que ahora se rechaza es `docker-compose.yml:33,36` (`NODE_ENV: production` + `dev-secret-change-me`); se resuelve cambiando compose y ejemplos de entorno, sin tocar workflows.
- Playwright: `frontend/e2e/README.md:9-12` exige el stack levantado (`docker compose up -d --build`); `frontend/playwright.config.ts` no define `webServer`, y `frontend/e2e/fixtures/login.ts:62,70` hace 3 logins por corrida (6 con la doble corrida documentada en `frontend/e2e/README.md:119`, 7 sumando el smoke test). Con límite 10 no hay `429`, pero se documenta `THROTTLE_LIMIT=10000` para el backend usado por esa suite.
- Los IDs del delta (`RF-RES-08`, `RF-RES-09`, `RF-PAG-06`, `RF-PAG-07`) están libres: `openspec/specs/gestion-reservas-turnos/spec.md` y `openspec/specs/pagos-auditoria-notificaciones/spec.md` usan nombres descriptivos sin IDs `RF-RES-xx`/`RF-PAG-xx`.
- `backend/package.json:23` referencia `./test/jest-e2e.json`, que **no existe** en `backend/test/`; no hay `*.e2e-spec.ts`. Se crea ese archivo con `passWithNoTests: true` y `setupFiles` apuntando a `backend/src/jest-setup.ts`.

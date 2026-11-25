## Context

Ver `proposal.md → Hallazgos verificados` para el inventario con archivo:línea. Resumen de restricciones que condicionan el diseño:

- El workspace usa un único `pnpm-lock.yaml` en la raíz: lo consumen CI (`.github/workflows/ci.yml:47`) y `backend/Dockerfile:21-24`. No hay lockfile en `backend/`.
- El backend corre detrás de un único proxy (Caddy): `Caddyfile:33` reescribe `X-Forwarded-For` con la IP real del cliente.
- Los tests unitarios globales mockean `@nestjs/jwt`, `passport-jwt` y `bcryptjs` en `backend/src/jest-setup.ts`; `backend/test/jest-e2e.json`, referenciado por `backend/package.json:23`, no existe y no hay `*.e2e-spec.ts` en `backend/test/`.
- `JwtStrategy.validate()` (`backend/src/auth/jwt.strategy.ts:16-44`) recupera el usuario desde la BD en cada solicitud, por lo que `req.user.rol` refleja el rol persistido, no solo el del token.
- Los IDs del delta (`RF-RES-08`, `RF-RES-09`, `RF-PAG-06`, `RF-PAG-07`) están libres: los specs principales no usan IDs `RF-RES-xx`/`RF-PAG-xx`, solo nombres de requirement descriptivos. No hay renumeración.
- Playwright no levanta el backend (`frontend/playwright.config.ts` no define `webServer`): `frontend/e2e/README.md:9-12` exige `docker compose up -d --build`. Los 3 logins por corrida salen del proceso Node de Playwright hacia el backend de Compose.

## Goals / Non-Goals

**Goals:**

- Limitar solo las dos rutas públicas de autenticación sin tocar `/health`.
- Que la IP usada por el limitador sea la del cliente detrás de Caddy.
- Una sola fuente del secreto JWT con validación fail-closed en todas las rutas de arranque (producción, tests, local).
- Autorización por rol y titularidad de datos fail-closed en la capa HTTP.
- Que los entornos de test (Jest, `test:db`, el nuevo config e2e y Playwright) no reciban `429` por el nuevo límite.
- Cobertura de prueba por cada requisito nuevo y regresiones de asignación masiva.

**Non-Goals:**

- Cambiar la duración del token, el payload JWT, el frontend o los workflows.
- Agregar tablas, columnas, migraciones de Prisma o reglas en triggers de PostgreSQL.
- Auditoría de eventos de auth, bloqueo de cuentas, política de contraseñas ni refresh tokens.
- Modificar endpoints que ya filtran correctamente (detalle/listado de alquileres, notificaciones, cancelación autogestionada).

## Decisions

### 1. Throttler por ruta, nunca global

Se instalará `@nestjs/throttler` (versión compatible con NestJS 12, a resolver con `pnpm view @nestjs/throttler version` durante la implementación) y se registrará `ThrottlerModule.forRoot([{ ttl, limit }])` con `THROTTLE_TTL=60000` y `THROTTLE_LIMIT=10`. Solo `POST /auth/login` y `POST /auth/register` llevarán `@UseGuards(ThrottlerGuard)` y `@Throttle({ default: { limit, ttl } })`. El contador incluye logins fallidos y exitosos: 10 solicitudes por minuto por IP pasan, la undécima responde `429`. El valor 10 (y no 5) se elige para no bloquear demos con varios usuarios compartiendo red.

**Alternativas consideradas:** guard global con `skipIf` para `/health` (rechazado: cualquier endpoint nuevo quedaría limitado por omisión, justo lo contrario de fail-closed para este cambio); rate limit en Caddy (rechazado: el usuario pidió que viva en NestJS y Caddyfile queda sin cambios); 5 intentos (rechazado: la propia suite de Playwright hace hasta 7 logins por corrida sumando smoke test).

La respuesta 429 y el contador se prueban con `curl` en local y con un test del guardián. El storage por defecto es en memoria: aceptable mientras exista una sola réplica del backend; se documenta como riesgo.

**Entorno de Playwright:** la suite hace 3 logins por corrida (`frontend/e2e/fixtures/login.ts:62,70`), 6 con la doble corrida documentada en `frontend/e2e/README.md:119` y 7 con el smoke test; con el límite 10 no se alcanza el `429`. Aun así, si la suite crece o se paraleliza más, hay que fijar `THROTTLE_LIMIT=10000` (manteniendo `THROTTLE_TTL=60000`) en el **proceso backend** que consume, hoy el servicio `backend` de `docker-compose.yml:32-40` o un override de test equivalente; no en la config de Playwright. `frontend/e2e/README.md:14-30` documenta las variables de ese entorno, pero este change no modifica el frontend.

### 2. `trust proxy = 1` a través del HttpAdapter

En `main.ts` se usará `app.getHttpAdapter().getInstance().set('trust proxy', 1)`, no `app.set(...)` directo: `INestApplication` no expone `set` con tipos seguros y el código compila con `typecheck`. El valor `1` corresponde al único salto de Caddy (`Caddyfile:33`), que reescribe `X-Forwarded-For` con la IP real del cliente; significa "confiar en exactamente un salto", que es Caddy → backend en `docker-compose.prod.yml`. Como Caddy sobrescribe `X-Forwarded-For` (`Caddyfile:33`), el valor recibido es la IP del cliente; el backend no está expuesto públicamente en producción.

**Alternativas consideradas:** `true` (confía en todos los proxies, permite suplantación de IP) y `false` (todos los clientes compartirían la IP de Caddy y, por tanto, un único contador). Ambas rechazadas.

### 3. Secreto JWT centralizado y validado antes de crear la app

Nuevo módulo `backend/src/auth/jwt.config.ts` con `obtenerJwtSecret()` y `obtenerJwtExpiration()` como única lectura de `JWT_SECRET` / `JWT_EXPIRATION`. `AuthModule` pasará a `JwtModule.registerAsync({ useFactory: ... })` y `JwtStrategy` usará el mismo `obtenerJwtSecret()` en `secretOrKey`, eliminando ambos fallbacks.

La validación del secreto vive en `backend/src/auth/jwt.config.ts`: `validarJwtSecret()` devuelve el motivo del rechazo (longitud <32, placeholders conocidos —`default-secret-change-me`, `dev-secret-change-me`, `your-jwt-secret-change-me`, `CAMBIAR_POR_TOKEN_CRIPTOGRAFICO_ALEATORIO_DE_MINIMO_32_CHARS`, `ci-placeholder-ci-placeholder-32chars`— en comparación case-insensitive, o coincidencias de `change-me`, `placeholder` y `cambiar_por`) y `obtenerJwtSecret()` lanza sin incluir el valor. `validarEntorno()` en `main.ts` consume `validarJwtSecret()` antes de `NestFactory.create`, por lo que en producción el proceso termina con el mismo JSON `level: "fatal"` y código 1; fuera de producción se lanza un `Error` con el mismo mensaje (fail-closed también en local).

**Alternativas consideradas:** `ConfigService` con esquema (rechazado: agrega dependencia y mueve la validación después del arranque de Nest); mantener el fallback solo en tests (rechazado: es exactamente el valor que permite falsificar tokens); hacer una excepción para el valor de CI (rechazado: debilita el fail-closed y no hace falta, ver abajo).

**CI:** `git grep -n "ci-placeholder" -- .github docker-compose*.yml backend` devuelve solo `.github/workflows/ci.yml:66` (`POSTGRES_PASSWORD: ci-placeholder`) y `:67` (`JWT_SECRET: ci-placeholder-ci-placeholder-32chars`). El step `:64-68` ejecuta únicamente `docker compose -f docker-compose.prod.yml config -q`: renderiza el YAML, no crea contenedores ni arranca el backend. Ningún workflow inicia el backend con ese valor, así que los workflows quedan fuera de alcance y no se tocan. Los valores rechazados en archivos versionados son intencionales: `.env.prod.example:18` conserva el placeholder `CAMBIAR_POR_TOKEN_CRIPTOGRAFICO_ALEATORIO_DE_MINIMO_32_CHARS` y `docker-compose.yml:36` usa el fallback `CAMBIAR_POR_SECRETO_JWT_DE_MINIMO_32_CHARS` (sin `:?`, para no romper `docker compose config` ni el build). Solo `.env.example` y `backend/.env.example` llevan secretos de desarrollo de 48 caracteres, con el aviso "Solo desarrollo local. Nunca usar este valor en producción". Las pruebas de regresión de `jwt.config.spec.ts` leen ambos archivos y comprueban que el validador rechaza esos placeholders. Los `.env` locales son responsabilidad de cada desarrollador (aviso en la tarea 7.3 y en el Migration Plan).

Secretos de prueba de 48 caracteres: `process.env.JWT_SECRET` en `backend/src/jest-setup.ts` (setupFiles de los tests unitarios), `setupFiles` nuevo en `backend/test/db/jest-db.config.js` y en el nuevo `backend/test/jest-e2e.json`, junto con `THROTTLE_LIMIT=10000` para que ninguna suite reciba `429`. `backend/test/jest-e2e.json` tendrá `passWithNoTests: true`, `rootDir: ".."`, `testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"]` y `setupFiles: ["<rootDir>/src/jest-setup.ts"]`; hoy no hay specs e2e en `backend/test/`, solo `*.db-spec.ts`, y el script `test:e2e` de `backend/package.json:23` falla porque el archivo de configuración no existe.

### 4. RolesGuard fail-closed

`canActivate` obtendrá el request con `context.switchToHttp().getRequest<{ user?: { rol?: string } }>()` y devolverá `false` si `user?.rol` es falso, antes de llamar a `requiredRoles.includes(...)`. Cuando no hay `@Roles`, el comportamiento actual de permitir se conserva.

A nivel HTTP, una solicitud sin token es rechazada por `AuthGuard('jwt')` con `401` **antes** de que se evalúe `RolesGuard`. El `false` de `canActivate` es la garantía interna fail-closed: Nest lo traduciría en `403` si el guardián llegara a ejecutarse (por ejemplo con un usuario sin rol).

**Alternativas consideradas:** lanzar `ForbiddenException` desde el guardián (rechazado: devolver `false` ya produce 403 y mantiene el contrato del guard de Nest).

`backend/src/auth/roles.guard.spec.ts` cubrirá los seis casos de RF-AUT-03.

### 5. Titularidad en la aplicación, reutilizando el concepto de "gerencia"

Todas las reglas nuevas viven en NestJS. No hay cambios en `backend/db/esquema-final.sql`, en triggers ni en `backend/prisma/migrations/`: la información ya existe (`reserva.id_persona`, `registroAuditoria.id_usuario`, `usuario.rol`).

- Se extrae `esGerencia(actor)` a `backend/src/auth/actor.ts` con una interfaz `Actor { id_usuario?: string; rol?: string }`. `ReservasService` dejará su copia privada (`reservas.service.ts:394-396`) y `PagosService` usará la misma función.
- `ReservasService`: `listarReservas(filtros, actor)` exigirá `actor`; un `SOCIO` sin `person_id` obtiene solo sus reservas, nunca el listado completo; `person_id` ajeno responde `403`. `getReserva(id, actor)` exigirá `actor`. Se extrae un método privado `buscarReserva(id)` con los `include` actuales para que `actualizarEstadoReserva` (`:192`) y `cancelarReservaAutogestionada` (`:235`) sigan funcionando sin pasar por el filtro de titularidad. El controlador pasará `req.user` en ambos endpoints.
- `PagosService`: `listarPagos(filtros, actor)` filtrará para `SOCIO` por `registroAuditoria.id_usuario` (`pagos.service.ts:97-112`; valor escrito en `:40` como copia de `reserva.id_persona`, **no** como id del gerente que registra). `getPagosReserva(id_reserva, actor)` validará `reserva.id_persona` contra `actor.id_usuario` (`pagos.service.ts:64-92`). Son criterios distintos para endpoints distintos. El controlador pasará `req.user` en ambos.
- `404` para recursos ajenos o inexistentes en consultas por identificador: evita confirmar la existencia de IDs de terceros. `403` para `?person_id` ajeno: el cliente está intentando cambiar explícitamente el alcance y no hay un recurso que ocultar. Se conserva el `403` ya existente de la cancelación autogestionada (`reservas.service.ts:245-249`).

**Alternativas consideradas:** filtrar `listarPagos` con un join a reservas (rechazado: los pagos son filas de `registroAuditoria` con `id_entidad`, no hay tabla `pagos`; el propio `id_usuario` ya es la copia del titular); filtrar con RLS de PostgreSQL (rechazado: hoy RLS está inerte, la app conecta como dueña de las tablas y no hay policies); devolver `403` en todo (rechazado: filtra datos con un mensaje que revela existencia); listas vacías en lugar de `403` para `?person_id` ajeno (rechazado: fail-closed pide rechazar).

### 6. Regresiones de asignación masiva

No hay cambio de código: los DTOs ya no exponen `rol`/`estado` y el `ValidationPipe` global rechaza propiedades desconocidas (`main.ts:87-93`). Se agregarán pruebas que construyan `RegisterPersonaDto` y `UpdatePerfilDto` con esas propiedades después del whitelist y verifiquen que no se aceptan. Como `jest-setup.ts:41-51` reemplaza `plainToInstance` por identidad, las pruebas usarán `class-validator` directamente sobre instancias de los DTO.

### 7. Lockfile y archivos de configuración

Se ejecutará `pnpm --filter club-deportivo-backend add @nestjs/throttler` desde la raíz con pnpm 12.10.1. Eso actualiza `backend/package.json` y **solo `pnpm-lock.yaml`** de la raíz; `frontend/pnpm-lock.yaml` no se toca. No se modificarán `.github/workflows/`, `Caddyfile`, `docker-compose.prod.yml` ni `.env.prod.example`. `.env.example` y `backend/.env.example` llevan secretos de desarrollo de 48 caracteres; `docker-compose.yml:36` conserva un fallback placeholder que el validador rechaza.

## Risks / Trade-offs

- **El limitador usa almacenamiento en memoria** → con más de una réplica del backend los contadores no se comparten; hoy hay un solo contenedor. Mitigación: verificar en local con `curl` y registrar la limitación; no se introduce Redis en este change.
- **Una red compartida con muchos usuarios podría alcanzar 10 logins/minuto** → se mitigó subiendo el default de 5 a 10 y documentando `THROTTLE_LIMIT=10000` para el backend de Playwright; cualquier otro entorno con más volumen debe fijar la misma variable.
- **`trust proxy` mal configurado permitiría suplantar la IP con `X-Forwarded-For`** → mitigado con valor `1`, Caddy sobrescribiendo la cabecera y sin exposición pública del puerto 3001; verificación con dos cabeceras `X-Forwarded-For` distintas en local.
- **El cambio de `JWT_SECRET` en el servidor invalida tokens vigentes y un `.env` local corto impide arrancar** → el paso manual 7.1 comprueba el secreto antes del merge; la descripción del PR avisa a quienes tengan `.env`/`backend/.env` con valores como `dev-secret-change-me` o `your-jwt-secret-change-me` de actualizarlos a ≥32 caracteres.
- **Nuevos `404`/`403` pueden romper clientes que hoy consultan datos ajenos** → está marcado como BREAKING en la propuesta; se cubre con los tests de los escenarios por endpoint y se revisa el contrato en el PR.
- **Los mocks globales de Jest pueden ocultar el comportamiento real del limitador** → no se agregará un mock de `@nestjs/throttler`; `transformIgnorePatterns` ya incluye `@nestjs`, así que los decoradores reales se cargan. Verificación: `pnpm run test`, `typecheck` y el `curl` manual.
- **`test:e2e` apuntaba a un archivo inexistente y no hay specs e2e** → se crea `backend/test/jest-e2e.json` con `passWithNoTests: true`; la tarea 6.4 puede pasar hoy y el archivo queda listo para futuros `*.e2e-spec.ts`.
- **`ci-placeholder` aparece en workflows pero no arranca backend** → `.github/workflows/ci.yml:66-67` solo alimenta `config -q` (`:64-68`). No se debilita el validador ni se tocan workflows. El riesgo real era `docker-compose.yml:33,36`, hoy mitigado con un fallback placeholder rechazado por el validador y cubierto por la prueba de regresión de archivos.
- **Frontend (solo lectura, sin modificaciones)**: `git grep` en `frontend/src` confirma que los únicos `person_id` son `user?.id` en `frontend/src/app/my-reservations/page.tsx:34-35`, `frontend/src/app/my-payments/page.tsx:31-32` y `frontend/src/app/reservations/new/page.tsx:84`; el detalle de SOCIO usa su propio id en `frontend/src/app/reservations/[id]/page.tsx:34`. Ningún flujo de SOCIO depende de ver reservas o pagos ajenos. Gerencia/admin omiten `person_id` y necesitan el listado completo: `frontend/src/app/reservations/manage/page.tsx:17` y `frontend/src/app/payments/new/page.tsx:22`. `frontend/src/proxy.ts:23` da a SOCIO el prefijo `/reservations`, pero el nuevo filtro bloquea cualquier intento directo a `/reservations/manage`.

## Migration Plan

Sin migración de base de datos. Orden de entrega:

1. Merge del PR a `main` con CI verde (lint, typecheck, test, test:db, test:e2e, OpenSpec).
2. ANTES del merge: confirmar en el servidor que `JWT_SECRET` tiene ≥32 caracteres y no es placeholder (tarea manual 7.1); avisar en el PR que cualquier `.env` local con secreto corto debe actualizarse o el backend no arrancará. No hace falta rotar el secreto del servidor si ya cumple.
3. El CD publica la imagen y despliega; no hay `prisma migrate deploy` nuevo.
4. Verificación en producción: `GET /api/v1/health` sigue respondiendo `200`, 10 logins seguidos no devuelven `429` y el undécimo sí.
5. Rollback: revertir el commit y relanzar el deploy de la imagen anterior. No hay datos nuevos que revertir; el secreto no se revierte.

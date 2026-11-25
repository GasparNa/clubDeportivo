## 1. Throttler solo en login y register

- [x] 1.1 Instalar `@nestjs/throttler` desde la raíz con pnpm 12.10.1 (`pnpm --filter club-deportivo-backend add @nestjs/throttler`) y verificar con `git status --short` y `git diff --name-only` que solo cambiaron `backend/package.json` y `pnpm-lock.yaml`; reportar explícitamente los lockfiles modificados (raíz: sí; `frontend/pnpm-lock.yaml`: no; `backend/pnpm-lock.yaml`: no existe) y que `pnpm install --frozen-lockfile` termina sin errores
- [x] 1.2 Registrar `ThrottlerModule.forRoot([{ ttl, limit }])` con `THROTTLE_TTL=60000` y `THROTTLE_LIMIT=10` y verificar con `git grep -n "ThrottlerModule\|@Throttle\|ThrottlerGuard" -- backend/src` que el guard aparece únicamente en `auth/register` y `auth/login` de `usuarios.controller.ts`
- [x] 1.3 Agregar pruebas unitarias del guardián (9 solicitudes dentro del límite, 429 en la 11ª de login, 429 en la 11ª de register, `/health` sin límite) y verificar con `pnpm --filter club-deportivo-backend exec jest --runInBand --testPathPattern="throttler|usuarios.controller"` que pasan

## 2. Trust proxy

- [x] 2.1 Configurar `app.getHttpAdapter().getInstance().set('trust proxy', 1)` en `backend/src/main.ts`, documentando en `design.md` que el valor `1` corresponde al único salto de Caddy (`Caddyfile:33`), y verificar con `pnpm --filter club-deportivo-backend run typecheck`
- [x] 2.2 Verificar con `curl` local que dos `X-Forwarded-For` distintos mantienen contadores separados y que once solicitudes a `GET /api/v1/health` siguen devolviendo `200` (se verifica con curl real en 7.2)
  - verificado con curl real el 23/11/2026: logins 1 a 10 con 401, el 11º con 429, otra IP separada con 401, la IP bloqueada sigue en 429 y /health con 200 en las 11 llamadas

## 3. JWT_SECRET centralizado y fail-closed

- [x] 3.1 Crear `backend/src/auth/jwt.config.ts`, migrar `AuthModule` a `JwtModule.registerAsync` y usar el mismo origen en `JwtStrategy`, verificando con `git grep -n "default-secret-change-me" -- backend/src` que no queda ninguna coincidencia
- [x] 3.2 Centralizar en `backend/src/auth/jwt.config.ts` la validación de longitud mínima de 32 y la lista de placeholders (incluidos `your-jwt-secret-change-me` y `ci-placeholder-ci-placeholder-32chars`), con comparación case-insensitive; `validarEntorno()` en `main.ts` consume `validarJwtSecret()` y conserva el JSON fatal; verificar con pruebas unitarias que un secreto corto y un placeholder producen `level: "fatal"` y que un secreto de 48 caracteres pasa
- [x] 3.3 Definir el secreto de prueba de 48 caracteres en `backend/src/jest-setup.ts` y en un `setupFiles` de `backend/test/db/jest-db.config.js`, junto con `THROTTLE_LIMIT=10000` para tests; verificar con `pnpm --filter club-deportivo-backend run test` que la suite sigue pasando
- [x] 3.4 Dejar secretos de desarrollo de 32+ caracteres en `.env.example` y `backend/.env.example` (con el comentario "Solo desarrollo local. Nunca usar este valor en producción"), conservar en `.env.prod.example` el placeholder `CAMBIAR_POR_TOKEN_CRIPTOGRAFICO_ALEATORIO_DE_MINIMO_32_CHARS`, usar `CAMBIAR_POR_SECRETO_JWT_DE_MINIMO_32_CHARS` como fallback de `docker-compose.yml`, y verificar con las pruebas de regresión de `jwt.config.spec.ts` que el validador rechaza los valores de `.env.prod.example` y `docker-compose.yml`, y que `docker compose config` sigue funcionando
- [x] 3.5 Verificar que ningún workflow arranca el backend con `ci-placeholder`: ejecutar `git grep -n "ci-placeholder" -- .github docker-compose*.yml backend` (solo `.github/workflows/ci.yml:66-67`) y confirmar en `:64-68` que el step es `docker compose -f docker-compose.prod.yml config -q`; dejar constancia en el PR de que no se tocaron workflows

## 4. RolesGuard fail-closed y pruebas

- [x] 4.1 Modificar `backend/src/auth/roles.guard.ts` para devolver `false` cuando falte `user` o `user.rol`, usando `getRequest<{ user?: { rol?: string } }>()`, y verificar con `pnpm --filter club-deportivo-backend run typecheck`
- [x] 4.2 Crear `backend/src/auth/roles.guard.spec.ts` con los seis casos de RF-AUT-03 (sin `@Roles` permite; rol permitido; rol equivocado; sin usuario → `canActivate` devuelve `false`; HTTP sin token → `AuthGuard('jwt')` responde `401` antes del guard de roles; usuario sin rol → `false`/`403`) y verificar con `pnpm --filter club-deportivo-backend exec jest --runInBand --testPathPattern="roles.guard"` que los seis pasan

## 5. Auditoría y correcciones de propiedad de datos con pruebas

- [x] 5.1 Releer `proposal.md → Hallazgos verificados` contra el código actual y confirmar uno a uno los once veredictos (ocho endpoints, RolesGuard y dos comprobaciones de asignación masiva), más el veredicto de identidad del pagador, y verificar que cada uno queda referenciado en un test nuevo o en una nota de "sin cambio" en este checklist
  - Nota 5.1 (sin cambio): `GET /equipment-rentals`, `GET /equipment-rentals/:id`, `GET /notifications` y `PATCH`/`DELETE /reservations/:id` ya filtraban; `RegisterPersonaDto` y `UpdatePerfilDto` no se tocaron (cobertura en 5.5); `RolesGuard` queda cubierto en `roles.guard.spec.ts`; la identidad del pagador sigue siendo `registroAuditoria.id_usuario` copiado de `reserva.id_persona` en `pagos.service.ts`.
- [x] 5.2 Extraer `Actor` y `esGerencia()` a `backend/src/auth/actor.ts` y reutilizarlos en `ReservasService` y `PagosService`, verificando con `git grep -n "esGerencia" -- backend/src` que no queda la copia privada duplicada
- [x] 5.3 Aplicar titularidad a `GET /reservations` y `GET /reservations/:id` (actor obligatorio desde el controlador; `SOCIO` sin `person_id` ve solo lo propio; `403` para `person_id` ajeno; `404` para reserva ajena; gerencia sin restricción), extrayendo `buscarReserva(id)` para los llamadores internos, y verificar con pruebas de los cinco escenarios del listado y cuatro del detalle que `pnpm --filter club-deportivo-backend exec jest --runInBand --testPathPattern="reservas"` pasa
- [x] 5.4 Aplicar titularidad a `GET /payments` filtrando `registroAuditoria.id_usuario` (copia de `reserva.id_persona` hecha en `pagos.service.ts:40`, NO el id de la gerencia que registra el pago) y a `GET /payments/reservation/:id` validando `reserva.id_persona`, con acceso completo para gerencia y `404` en reserva ajena; pasar `req.user` desde el controlador y verificar con pruebas de los cinco escenarios por endpoint que `pnpm --filter club-deportivo-backend exec jest --runInBand --testPathPattern="pagos"` pasa
- [x] 5.5 Agregar pruebas de regresión de asignación masiva para `RegisterPersonaDto` y `UpdatePerfilDto` con `rol` y `estado` en el payload, verificando con `pnpm --filter club-deportivo-backend exec jest --runInBand --testPathPattern="usuarios"` que se rechazan sin haber tocado los DTO
- [x] 5.6 Confirmar con `git diff backend/src/reservas backend/src/pagos` que `GET /equipment-rentals`, `GET /equipment-rentals/:id`, `GET /notifications` y `PATCH`/`DELETE /reservations/:id` no fueron modificados, porque ya filtran según los hallazgos verificados
  - Nota 5.6: en los dos `GET /equipment-rentals` el único renglón tocado es la llamada al helper compartido de 5.2; los filtros, actores y respuestas se mantienen iguales.

## 6. Verificación integral

- [x] 6.1 Ejecutar `pnpm --filter club-deportivo-backend run lint` y `pnpm --filter club-deportivo-backend run typecheck` sin errores
- [x] 6.2 Ejecutar `pnpm --filter club-deportivo-backend exec jest --runInBand` con todas las pruebas unitarias en verde
- [x] 6.3 Ejecutar `pnpm --filter club-deportivo-backend run test:db` contra PostgreSQL 16 local con `TEST_DATABASE_URL` configurada, sin errores
- [x] 6.4 Ejecutar `pnpm --filter club-deportivo-backend run test:e2e` con `backend/test/jest-e2e.json` ya creado (`rootDir: ".."`, `testMatch: ["<rootDir>/test/**/*.e2e-spec.ts"]`, `setupFiles: ["<rootDir>/src/jest-setup.ts"]`, `passWithNoTests: true`), sin errores aunque hoy no haya specs e2e
- [x] 6.5 Ejecutar `pnpm exec openspec validate --all --strict` sin errores
- [x] 6.6 Ejecutar `git diff --check` y revisar `git status --short` y `git diff --name-only`, confirmando que no aparecen `frontend/`, `.github/workflows/`, `Caddyfile`, `docker-compose.prod.yml` ni migraciones de Prisma

## 7. Pasos manuales y entrega

- [ ] 7.1 ANTES del merge, verificar en el servidor (`/opt/club-deportivo/.env.prod`) que `JWT_SECRET` tiene al menos 32 caracteres y no es un placeholder; si hay que rotarlo, coordinar el re-login de los usuarios y registrarlo en la descripción del PR
- [x] 7.2 Probar en local con `curl` 11 logins fallidos seguidos (esperar que los 10 primeros no devuelvan `429` y que el 11º sí), 11 llamadas a `/api/v1/health` (esperar `200` en todas) y dos `X-Forwarded-For` distintos (esperar contadores separados), adjuntando la salida al PR
  - verificado con curl real el 23/11/2026: logins 1 a 10 con 401, el 11º con 429, otra IP separada con 401, la IP bloqueada sigue en 429 y /health con 200 en las 11 llamadas
- [ ] 7.3 Crear el PR desde `feature/endurecimiento-auth` hacia `main` con: la evidencia de los pasos 7.1, 7.2 y 3.5; el aviso explícito **"Si tenés un `.env` local con el secreto corto, actualizalo a 32 caracteres o más: después de este cambio el backend no arrancará"**; el detalle de que los workflows no se tocaron porque `ci.yml:64-68` solo valida el compose; CI en verde (lint, typecheck, test, test:db, test:e2e, OpenSpec); una aprobación de otro compañero y squash merge; luego cerrar y archivar el change OpenSpec

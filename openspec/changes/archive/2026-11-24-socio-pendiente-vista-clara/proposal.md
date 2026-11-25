## Why

Un SOCIO con cuenta `PENDIENTE` puede iniciar sesión (el backend solo bloquea el login de cuentas `SUSPENDIDO`) y es enviado por defecto a `/my-reservations`. Allí `useRequireActiveUser()` devuelve `null` y las pantallas de reservas devuelven `null`, produciendo una página en blanco sin explicación, mientras que `/profile` sí carga y muestra el estado. El problema afecta a SOCIO, GERENTE y ADMINISTRADOR autenticados cuyo `estado` no sea `ACTIVO`.

## What Changes

- Agregar un componente reutilizable `AvisoCuentaPendiente` con un enlace a "Mi perfil" (`/profile`), un `StatusBadge` con el `estado` real del usuario y dos textos posibles: para `PENDIENTE`, "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar."; para cualquier otro estado no `ACTIVO`, "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club.". Se usan componentes y estilos ya existentes (`StatusBadge`, `AuthenticatedLayout`, utilidades de Tailwind del design system).
- Renderizar ese aviso en `my-reservations/page.tsx`, `reservations/new/page.tsx` y `reservations/[id]/rent-equipment/page.tsx` cuando el usuario esté autenticado pero no `ACTIVO`, en lugar de `return null`.
- Obtener la distinción "autenticado pero no activo" vs. "sin sesión" sin romper el contrato de `useRequireActiveUser()` (se propone un hook derivado con resultado discriminado; el hook actual queda intacto).
- En `login-client.tsx`, si `response.usuario.estado !== "ACTIVO"`, redirigir siempre a `/` ignorando el parámetro `redirect` y `getDashboardPath()`. Con `estado === "ACTIVO"` el comportamiento actual no cambia.
- Agregar una prueba de regresión backend que fije el rechazo de `POST /reservations` y `POST /equipment-rentals` para usuarios `PENDIENTE`. No se modifica la lógica ni la spec de backend.
- Agregar cobertura e2e con Playwright (único framework de pruebas del frontend) para todos los escenarios de `frontend-app`; la suite se ejecuta a mano porque el CI actual no corre Playwright.
- **Sin cambios BREAKING**: no se altera el contrato de la API, el esquema de BD, las reglas de negocio vigentes ni las dependencias.

## Capabilities

### New Capabilities

- (ninguna)

### Modified Capabilities

- `frontend-app`: nuevas reglas de renderizado para cuentas autenticadas no `ACTIVAS` en pantallas de reservas, y nueva regla de redirección post-login según el `estado` del usuario.

## Impact

- **Frontend**: nuevo componente de aviso, nuevo hook derivado de acceso, tres páginas de reservas y `login-client.tsx`; nuevas pruebas en `frontend/e2e/tests/`.
- **Backend**: solo una nueva prueba unitaria (Jest) para `ActiveUserGuard` y, si hace falta, aserciones de metadata en `reservas.controller.spec.ts`. Sin cambios de comportamiento.
- **Base de datos / infraestructura / workflows / dependencias**: sin cambios.
- **Repositorio**: se ignoran en git las salidas generadas de Playwright (playwright-report y test-results) para que los e2e no ensucien el árbol ni el lint.
- **Specs**: delta nueva sobre `frontend-app`; la regla de "solo usuarios ACTIVO" de `gestion-reservas-turnos` ya existe y no se modifica.

## Hallazgos verificados (lectura sin edición)

- El backend **ya rechaza** a un usuario `PENDIENTE` en ambos endpoints: `backend/src/reservas/reservas.controller.ts:55-56` (`POST /reservations`) y `backend/src/reservas/reservas.controller.ts:126-127` (`POST /equipment-rentals`) declaran `@UseGuards(AuthGuard('jwt'), ActiveUserGuard)`.
- `ActiveUserGuard` lanza `ForbiddenException` cuando `estado !== 'ACTIVO'` en `backend/src/auth/active-user.guard.ts:26-28`; el mensaje es "El usuario debe estar ACTIVO para realizar esta operación". El guard es instanciable por Nest porque `PrismaService` es global (`backend/src/prisma/prisma.module.ts:4-8`).
- No existe hoy una prueba que fije ese rechazo: no hay `active-user.guard.spec.ts` y `backend/src/reservas/reservas.controller.spec.ts:41-126` solo cubre los `GET` de alquileres y la presencia de `AuthGuard('jwt')`. Por eso el change incluye la prueba de regresión, sin tocar la implementación.
- El login de un `PENDIENTE` sí llega al frontend: `backend/src/usuarios/usuarios.service.ts:153-155` solo rechaza `SUSPENDIDO` y `:173` devuelve `estado` en la respuesta.
- Origen del problema en el frontend: `frontend/src/lib/auth-provider.tsx:64-66` (predicado `estado !== "ACTIVO"`), `frontend/src/app/my-reservations/page.tsx:69-71`, `frontend/src/app/reservations/new/page.tsx:102-104` y `frontend/src/app/reservations/[id]/rent-equipment/page.tsx:97-98` (`return null`).
- Redirect actual: `frontend/src/app/login/login-client.tsx:54-55` usa `searchParams.get("redirect")` o `getDashboardPath(rol)`; el parámetro lo genera `frontend/src/proxy.ts:44-47` al no haber cookie `token`. `getDashboardPath` está en `frontend/src/lib/navigation.ts:115-126`; el proxy no evalúa `estado` (`frontend/src/proxy.ts:50-72`).
- Framework de pruebas: `frontend/package.json:10-15` expone solo Playwright (`test:e2e`), con `frontend/playwright.config.ts:3-14` (testDir `./e2e`, `baseURL` configurable); no hay framework de tests unitarios en el frontend. Los tests existentes están en `frontend/e2e/tests/` y usan inyección de `localStorage` (`login-socio.test.ts:36-47`).

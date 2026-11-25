## Context

Ver `proposal.md` para la motivación y el alcance. `frontend-app` ya define reglas de renderizado, pero hoy no cubre el caso "autenticado con `estado` no `ACTIVO`". El predicado de acceso vive en `frontend/src/lib/auth-provider.tsx` (`useRequireActiveUser`), que colapsa "sin sesión" y "no activo" en el mismo `null`; tres páginas traducen ese `null` en `return null`. El post-login elige destino en `frontend/src/app/login/login-client.tsx` sin mirar `estado`. El backend ya aplica la regla de negocio con `ActiveUserGuard` y no se va a modificar; el aviso es solo UX.

## Goals / Non-Goals

**Goals:**

- Dar una distinción explícita y reutilizable entre "sin sesión", "autenticado no activo" y "autenticado activo" sin cambiar el contrato de `useRequireActiveUser()`.
- Reutilizar un único componente visual de aviso, con el layout y el design system actuales.
- Fijar con pruebas todos los escenarios de la spec y el rechazo backend ya existente.

**Non-Goals:**

- Cambiar la regla de negocio (queda en la app NestJS `ActiveUserGuard` y en los triggers de PostgreSQL; sin migraciones de Prisma).
- Modificar el proxy, los workflows de CI/CD ni las dependencias.
- Refrescar el `estado` de la sesión en cada navegación ni agregar polling; `/profile` ya consulta el estado vigente al API.

## Decisions

1. **Hook discriminado nuevo, contrato viejo intacto.** Agregar `useAccountAccess()` junto a `useRequireActiveUser()` en `frontend/src/lib/auth-provider.tsx`, con un resultado discriminado (`activo` / `inactivo` / `sin-sesion`) que incluye el `user` cuando hay sesión. `useRequireActiveUser()` pasa a delegar en él y sigue devolviendo `SessionUser | null` con exactamente el mismo significado. Las tres páginas cambian su guardia por `acceso.kind`.
   - Alternativa descartada: hacer que `useRequireActiveUser()` devuelva el usuario no activo. Rompería la comprobación `activeUser === null` que hoy bloquea acciones en `reservations/[id]/rent-equipment`.
   - Alternativa descartada: crear un hook en un archivo aparte. Duplicaría el predicado `estado !== "ACTIVO"` fuera del módulo de autenticación.
2. **Aviso como componente de contenido, no como página.** `frontend/src/components/aviso-cuenta-pendiente.tsx` exportado desde `components/index.ts` renderiza una tarjeta con `IconAlertTriangle`, un `StatusBadge` con el `estado` real del usuario (no un valor fijo), el texto correspondiente según el estado y un `Link` a `/profile`. Para `PENDIENTE`: "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar.". Para cualquier otro estado no `ACTIVO`: "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club.". Cada página conserva su `<AuthenticatedLayout>` y coloca el aviso dentro, para no perder navbar/sidebar ni el comportamiento de las rutas públicas.
   - Alternativa descartada: que el componente incluya el layout. Acoplaría el aviso a una sola posición y complicaría su uso en las tres pantallas.
3. **Un mismo componente, dos textos según el estado.** El predicado de acceso es el mismo que usa `useRequireActiveUser()` (`PENDIENTE`, `INACTIVO`, `SUSPENDIDO`), pero el componente elige el texto: el original para `PENDIENTE` y el alternativo para cualquier otro estado no `ACTIVO`. El `StatusBadge` muestra siempre el `estado` real del usuario, no un valor fijo. Ambos textos y el badge quedan fijados en RF-FE-01.
4. **Login: rama temprana antes de leer `redirect`.** En `onSuccess`, después de `login(token, user)`, si `response.usuario.estado !== "ACTIVO"` hacer `router.push("/")` y retornar. Para `ACTIVO` se dejan intactas la lectura de `searchParams.get("redirect")` y la llamada a `getDashboardPath(rol)`. `AuthResponse.usuario.estado` ya está tipado como `UserStatus` en `frontend/src/lib/types.ts`.
5. **Pruebas con lo que ya existe.** No hay framework unitario en el frontend (`frontend/package.json` solo expone `test:e2e` de Playwright), así que todos los escenarios van en `frontend/e2e/tests/` con `page.route("**/api/v1/**")` para responder sin depender de credenciales ni de un socio `PENDIENTE` real. El fixture de sesión debe fijar **también la cookie `token`**, porque `frontend/src/proxy.ts:41` decide el acceso desde `request.cookies.get("token")` y solo después decodifica el payload; `localStorage` es lo que lee la app (`frontend/src/lib/auth.ts:63-72`), pero sin cookie el proxy redirige a `/login` antes de renderizar. Se inyecta un token con payload decodificable, la misma cookie que escribe `setSession` (`frontend/src/lib/auth.ts:52-59`) y `localStorage.user` con el `estado` deseado, extendiendo el patrón de `login-socio.test.ts`. Para el backend se agrega `backend/src/auth/active-user.guard.spec.ts` (Jest) con `PrismaService` mockeado y se amplían las aserciones de metadata de `reservas.controller.spec.ts` para los dos `POST`.
   - Alternativa descartada: agregar Vitest/Jest al frontend. Introduciría dependencias y configuración fuera del alcance.

## Risks / Trade-offs

- [El `estado` en `localStorage` puede quedar viejo si un administrador cambia la cuenta mientras la sesión sigue abierta] → Mitigación: el aviso es solo presentación; el backend sigue siendo autoritativo mediante `ActiveUserGuard`, y `/profile` consulta el estado fresco. No se cambia la spec.
- [Los textos son distintos según el estado y el badge debe mostrar el estado real] → Mitigación: el componente recibe el `estado` de la sesión y elige el texto en un único lugar; ambos textos y el badge están cubiertos por RF-FE-01 y por los tests de la tarea 4.2, incluido el escenario `INACTIVO`.
- [Un token falso en e2e provoca `401` y el `http-client` redirige a `/login`, enmascarando el aviso] → Mitigación: interceptar todas las llamadas `**/api/v1/**` en el fixture y asertar que la URL final no es `/login`; el test de "sin sesión" es el único que espera esa redirección.
- [Los e2e existentes dependen de `E2E_BASE_URL` y credenciales] → Mitigación: los nuevos tests son deterministas (stub de API) y no usan `SOCIO_EMAIL`/`SOCIO_PASSWORD`.
- [Los e2e de Playwright no corren en el CI actual: `.github/workflows/ci.yml` solo ejecuta lint, pruebas unitarias, integración con PostgreSQL y build del frontend] → Mitigación: ejecutar la suite a mano con la app levantada y registrar el resultado en la descripción del PR (tarea 6.2); la definición de hecho queda fijada en RF-FE-01/02/03 y revisada en el PR.

## Migration Plan

Sin migración de base de datos ni cambios de backend en producción: el único cambio del lado servidor es un archivo de prueba. Despliegue por el `cd.yml` habitual al publicar la imagen del frontend; rollback consiste en revertir el PR. No se requiere feature flag ni limpieza de datos.

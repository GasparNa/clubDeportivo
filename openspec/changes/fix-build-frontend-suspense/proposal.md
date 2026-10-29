## Why

El deploy en Vercel falla y el dominio `https://club-deportivo-phi.vercel.app` responde `404` con `X-Vercel-Error: NOT_FOUND`. La causa no es la configuración de Vercel ni el `Root Directory`: **`next build` aborta** y por lo tanto nunca existe un deployment.

El error de build es:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/availability"
Error occurred prerendering page "/availability".
Export encountered an error on /availability/page: /availability, exiting the build.
```

`frontend/src/app/availability/page.tsx:17` y `frontend/src/app/login/page.tsx:25` llaman `useSearchParams()` en componentes `"use client"` sin un límite `<Suspense>`, lo que Next.js rechaza al prerenderizar.

Al verificar el código se encontró un segundo defecto que habría aparecido apenas el build pasara: 4 pantallas filtran las disciplinas con `d.estado === "ACTIVO"`, pero la tabla `Disciplina` **no tiene columna `estado`** (`backend/prisma/schema.prisma`), por lo que el filtro descarta todas y las pantallas quedan vacías.

## What Changes

- **Rutas prerenderizables**: `/availability` y `/login` pasan a ser server components que envuelven al componente cliente en `<Suspense>`, de modo que `next build` completa la generación estática de todas las rutas.
- **Listado de disciplinas tolerante a la ausencia de `estado`**: se reemplaza el filtro `d.estado === "ACTIVO"` por el helper `isVisibleEntity()` que ya existe en `frontend/src/lib/api-mappers.ts` y trata la ausencia de `estado` como visible.

## Capabilities

### New Capabilities
- `frontend-app`: reglas de renderizado del frontend (rutas prerenderizables y filtrado de entidades visibles) para que el build de producción funcione y las listados no queden vacíos.

### Modified Capabilities
- Ninguna (no cambia ningún contrato de negocio ni del API).

## Impact

- **Frontend**: `frontend/src/app/availability/page.tsx`, `frontend/src/app/login/page.tsx`, `frontend/src/app/page.tsx`, `frontend/src/app/disciplines/page.tsx`, `frontend/src/app/reservations/new/page.tsx`, y los nuevos `*-client.tsx`.
- **Backend / API**: sin cambios. El endpoint `/api/v1/disciplines` ya responde correctamente; el problema era del consumidor.
- **Base de datos**: sin migraciones.
- **Despliegue**: sin cambios de configuración en Vercel. Basta con que el build termine en `Ready` para que exista un deployment y deje de responder `NOT_FOUND`.

## Context

El dominio `https://club-deportivo-phi.vercel.app` devuelve `404` con `X-Vercel-Error: NOT_FOUND` y `Content-Type: text/plain`, sin ninguna cabecera de Next.js. Eso descarta que sea un problema de rutas o de `Root Directory`: la plataforma responde su propio NOT_FOUND cuando **no hay ningún deployment**. El build local reproduce el problema:

```
⨯ useSearchParams() should be wrapped in a suspense boundary at page "/availability"
Error occurred prerendering page "/availability".
Export encountered an error on /availability/page: /availability, exiting the build.
```

Al leer el código del frontend aparecieron dos defectos independientes:

1. `useSearchParams()` se usa en `frontend/src/app/availability/page.tsx:17` y `frontend/src/app/login/page.tsx:25`. Son las **únicas** dos apariciones de APIs dinámicas que rompen el prerenderado (`cookies()`, `headers()` y `draftMode` no se usan en ninguna parte).
2. `frontend/src/app/page.tsx:60`, `disciplines/page.tsx:19`, `reservations/new/page.tsx:52` y `availability/page.tsx:30` filtran con `d.estado === "ACTIVO"`, pero `model Disciplina` en `backend/prisma/schema.prisma` sólo tiene `id_disciplina`, `nombre`, `descripcion` y `creado_en`. El API responde sin `estado`, `normalizeDisciplina` lo deja en `undefined` y `undefined === "ACTIVO"` es `false`: los cuatro listados quedan vacíos y **no se puede crear una reserva desde la UI**.

## Goals / Non-Goals

**Goals:**
- Que `next build` termine y prerenderice todas las rutas, sin perder funcionalidad en las dos páginas afectadas.
- Que los listados de disciplinas muestren los datos reales del API.
- Que exista un único criterio de visibilidad de entidades reutilizable.

**Non-Goals:**
- No cambiar el contrato del API ni agregar `estado` a la tabla `Disciplina` (el dominio no define baja lógica para disciplinas).
- No reconfigurar Vercel ni Render: con el build en verde alcanza.
- No corregir el desalineo de tipos `CourtStatus` vs. `DISPONIBLE` (no bloquea nada; se tracta aparte).

## Decisions

- **Server wrapper + `<Suspense>` en vez de `export const dynamic = "force-dynamic"`**: la alternativa oficial de Next para `missing-suspense-with-csr-bailout` es el límite de Suspense. `force-dynamic` también funciona, pero exige el mismo wrapper server y desactiva la optimización estática de esas rutas sin ganancia.
- **El page queda como server component sin `"use client"`**: cada `page.tsx` pasa a ser una función async mínima que renderiza `<Suspense fallback={...}>` alrededor del componente cliente movido a `*-client.tsx`. Así el `fallback` se puede diseñar en cada pantalla y el componente cliente conserva su estado intacto.
- **`useSearchParams()` se queda en el componente cliente**: `/availability` lo usa como estado inicial (`discipline_id`) y `/login` lo lee en el `onSuccess` de la mutación. Mover la lectura al server obligaría a pasar props por el callback de react-query y a reescribir lógica que ya funciona.
- **Reutilizar `isVisibleEntity()`**: ya existe en `frontend/src/lib/api-mappers.ts`, ya tolera el `estado` ausente y acepta `DISPONIBLE`, y **no lo usa ninguna página**. Adoptarlo evita inventar un segundo criterio y deja el filtro en un solo lugar.

## Risks / Trade-offs

- El `fallback` del `Suspense` se ve brevemente durante la hidratación ⇒ se replica la carga/skeleton que ya usan las pantallas para no saltos de layout.
- `Disciplina.estado` queda como campo opcional en el tipo (`estado?: "ACTIVO" | "INACTIVO"`) ⇒ sigue siendo válido para un futuro backend que sí lo devuelva.
- Que el build termine en verde no garantiza que las rutas se prerendericen si alguien reintroduce una API dinámica sin `Suspense` ⇒ el criterio de aceptación es "el build lista todas las rutas en Generating static pages", no solo exit code 0.

## Migration Plan

1. Mergear esta change y esperar el redeploy automático de Vercel.
2. Confirmar en Vercel que el deployment quedó en `Ready`.
3. Verificar `https://club-deportivo-phi.vercel.app/login` (200) y que el selector de disciplinas de `/availability` lista las 4 disciplinas del backend.

Sin migraciones de base de datos.

## Open Questions

- ¿Conviene agregar un job de CI que corra `next build` para evitar que un error de build vuelva a llegar a producción? Queda fuera de esta change (CI es un change aparte ya identificado).

## 1. Especificación (API-First)

- [x] 1.1 Crear la change `fix-build-frontend-suspense` con proposal, delta spec de la capability nueva `frontend-app`, design y tasks, y verificar `openspec status --change fix-build-frontend-suspense` con los 4 artifacts en `done`
- [x] 1.2 Declarar en la spec los requisitos de rutas prerenderizables con query params y de listado de entidades visibles tolerante a la ausencia de `estado`

## 2. Build de producción

- [x] 2.1 Partir `frontend/src/app/availability/page.tsx`: `page.tsx` como server component con `<Suspense>` y el cuerpo actual movido a `availability-client.tsx`
- [x] 2.2 Partir `frontend/src/app/login/page.tsx`: `page.tsx` como server component con `<Suspense>` y el cuerpo actual movido a `login-client.tsx`
- [x] 2.3 Verificar que `next build` completa la generación estática de todas las rutas (sin `missing-suspense-with-csr-bailout` ni ninguna ruta omitida)

## 3. Listados de disciplinas

- [x] 3.1 Reemplazar `d.estado === "ACTIVO"` por `isVisibleEntity(d)` en `frontend/src/app/page.tsx`
- [x] 3.2 Reemplazar el filtro equivalente en `frontend/src/app/disciplines/page.tsx`
- [x] 3.3 Reemplazar el filtro equivalente en `frontend/src/app/reservations/new/page.tsx`
- [x] 3.4 Reemplazar el filtro equivalente en `frontend/src/app/availability/page.tsx` (dentro de `availability-client.tsx`)
- [x] 3.5 Verificar contra el backend real que los 4 listados muestran las disciplinas existentes (antes mostraban 0)

## 4. Verificación

- [x] 4.1 `next build` en verde: exit 0, `Generating static pages (24/24)` y `/availability` y `/login` como rutas estáticas (`○`)
- [x] 4.2 ESLint sin errores nuevos (0 errores; 21 warnings preexistentes de los compañeros)
- [x] 4.3 `openspec validate fix-build-frontend-suspense --strict` válido
- [x] 4.4 Smoke test con `next start`: `/`, `/login`, `/availability` y `/disciplines` devuelven 200

## 5. Pendiente — acciones del equipo (requieren cuentas)

- [ ] 5.1 Mergear el PR de `fix-build-frontend-suspense` y esperar el redeploy de Vercel
- [ ] 5.2 Confirmar en Vercel que el deployment quedó en `Ready`
- [ ] 5.3 Verificar `https://club-deportivo-phi.vercel.app/login` (200) y que `/availability` lista las disciplinas

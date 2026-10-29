## 1. Especificación (API-First)

- [x] 1.1 Crear la change `fix-disciplinas-contador-canchas` con proposal, design, delta spec de `frontend-app` y tasks, y verificar `openspec status --change fix-disciplinas-contador-canchas` con los 4 artifacts en `done`
- [x] 1.2 Declarar en la spec los requisitos: consumo de respuestas normalizadas en pantallas públicas, conteo de canchas con `_count`, tipos alineados con la BD y disponibilidad pública sin sesión

## 2. Causa raíz: respuestas sin normalizar

- [x] 2.1 Confirmar que `frontend/src/lib/http-client.ts` no normaliza y enumerar los call sites públicos afectados
- [x] 2.2 `frontend/src/app/availability/availability-client.tsx`: normalizar `/disciplines` con `normalizeDisciplina` y `/courts` con `normalizeCancha`
- [x] 2.3 `frontend/src/app/disciplines/page.tsx`: normalizar `/disciplines`
- [x] 2.4 `frontend/src/app/disciplines/[id]/page.tsx`: normalizar `/disciplines/:id`
- [x] 2.5 `frontend/src/app/page.tsx`: normalizar `/disciplines`
- [x] 2.6 Confirmar que `/time-slots/availability` no necesita normalización (`TimeSlotGrid` lee `id_franja`/`hora_inicio`/`hora_fin`/`disponible`, que el API devuelve tal cual)

## 3. Conteo de canchas y tipos

- [x] 3.1 Agregar `courtCount()` en `frontend/src/lib/api-mappers.ts` con precedencia `_count.canchas` → `canchas.length` → `0`
- [x] 3.2 Usar `courtCount()` en `frontend/src/app/disciplines/page.tsx`
- [x] 3.3 Usar `courtCount()` en `frontend/src/app/page.tsx`
- [x] 3.4 Agregar `"DISPONIBLE"` a `CourtStatus` en `frontend/src/lib/types.ts`

## 4. Verificación

- [x] 4.1 `next build` en verde: exit 0 y `Generating static pages (24/24)`
- [x] 4.2 ESLint sin errores nuevos (0 errores; 21 warnings preexistentes)
- [x] 4.3 `openspec validate fix-disciplinas-contador-canchas --strict` válido
- [x] 4.4 Contraste de los normalizadores contra la API real: los 4 `courtCount` dan 1, los 4 `id` de disciplina son UUID válidos y el `id` de cancha del endpoint filtrado es un UUID

## 5. Pendiente - acciones del equipo (requieren cuentas)

- [ ] 5.1 Mergear el PR y esperar el redeploy de Vercel
- [ ] 5.2 Confirmar en producción que `/disciplinas` muestra "1 cancha disponible", que las tarjetas abren `/disciplinas/<uuid>` (ya no 404) y que el dropdown de canchas de `/availability` se llena al elegir la disciplina
- [ ] 5.3 Recorrer sin sesión iniciada: `/disciplinas`, `/disciplinas/:id` y `/availability` deben ser públicas
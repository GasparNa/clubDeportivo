## Why

El flujo público del club está roto: en `/disciplinas` nunca se ve cuántas canchas hay, en `/availability` el dropdown de canchas queda vacío, y al tocar una disciplina el enlace lleva a `/disciplinas/undefined`.

La causa raíz no es el conteo: es que **el API devuelve snake_case y el frontend lo consume crudo en 4 pantallas públicas**. `frontend/src/lib/http-client.ts` no normaliza nada (no tiene un solo uso de `normalize*`), y los mappers existen pero solo se usan en `reservations/new/page.tsx`.

Consecuencia en `/availability`, paso a paso:

| Paso | Qué pasa |
| --- | --- |
| `GET /disciplines` responde `{"id_disciplina":"8b1e...", "nombre":"Fútbol 5"}` | sin normalizar |
| `availability-client.tsx:88` hace `<option key={d.id} value={d.id}>` | `d.id` es `undefined` |
| El `<option>` queda sin atributo `value` | el navegador usa el **texto** como valor |
| El usuario elige "Fútbol 5" | `disciplineId = "Fútbol 5"` |
| `GET /courts?discipline_id=Fútbol 5` | UUID inválido → el backend rechaza la request |
| `canchas` queda `undefined` | **dropdown de canchas vacío** |

Consecuencias adicionales en el resto del flujo público:

- `disciplines/page.tsx` y `page.tsx`: `href={`/disciplines/${disciplina.id}`}` con `id` undefined → **404 al tocar cualquier tarjeta**.
- Los mismos archivos leen `disciplina.canchas.length`: la colección no trae ese array (solo `_count.canchas`), así que el bloque ni siquiera se renderiza (no muestra "0", no muestra nada).
- `disciplines/[id]/page.tsx`: `href={`/availability?discipline_id=${disciplina.id}`}` con id undefined, y `cancha.id` undefined como key.

El panel de administración no sufre esto porque `admin/disciplines/page.tsx:75` ya lee `_count.canchas`, que el API sí manda en crudo.

## What Changes

- **Normalizar las respuestas públicas**: los 4 call sites de `Disciplina`/`Cancha` del flujo público pasan la respuesta por `normalizeDisciplina()` / `normalizeCancha()`, siguiendo el patrón que ya usa `reservations/new/page.tsx`.
- **Helper `courtCount()`**: resuelve el número de canchas con precedencia `_count.canchas` → `canchas.length` → `0`, en un solo lugar reutilizable.
- **`CourtStatus` refleja la BD**: se agrega `"DISPONIBLE"`, que es el valor real de `Cancha.estado` y faltaba en el tipo.

Sin cambios en backend, base de datos ni configuración de despliegue.

## Capabilities

### New Capabilities
- Ninguna.

### Modified Capabilities
- `frontend-app`: los listados y selectores públicos SHALL consumir respuestas normalizadas y SHALL reportar el conteo de canchas que devuelve el API, sin asumir que el array `canchas` viene embebido ni que el `id` está en camelCase.

## Impact

- **Frontend**:
  - `frontend/src/app/availability/availability-client.tsx` (disciplinas y canchas normalizadas)
  - `frontend/src/app/disciplines/page.tsx` (normalización + `courtCount`)
  - `frontend/src/app/disciplines/[id]/page.tsx` (normalización)
  - `frontend/src/app/page.tsx` (normalización + `courtCount`)
  - `frontend/src/lib/api-mappers.ts` (`courtCount()`)
  - `frontend/src/lib/types.ts` (`CourtStatus` incluye `DISPONIBLE`)
- **Sin tocar**: `backend/` (el contrato del API no cambia), `frontend/src/lib/http-client.ts`, `frontend/src/app/admin/*` (ya leen los campos crudos correctamente), `frontend/src/components/time-slot-grid.tsx`.
- **Base de datos**: sin migraciones. Las canchas y franjas se cargaron por script puntual, no por seed.
- **Despliegue**: requiere redeploy de Vercel para que el fix llegue a producción.
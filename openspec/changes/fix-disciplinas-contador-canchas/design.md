## Context

El API responde con los nombres de columna de PostgreSQL (`id_disciplina`, `id_cancha`, `precio_base`), mientras que la capa de presentación del frontend trabaja con un tipo en camelCase (`id`, `precio_base` ya coincide, pero `id` no).

`api-mappers.ts` resuelve esa diferencia y ya expone todo lo necesario:

```ts
export function normalizeDisciplina(raw: unknown): Disciplina {
  const data = asRaw(raw);
  const count = asRaw(data._count);
  return {
    id: pickId(data, ["id", "id_disciplina"]),   // ambos formatos
    canchas: asList(data.canchas).map(normalizeCancha),
    _count: typeof count.canchas === "number" ? { canchas: count.canchas } : undefined,
    ...
```

El problema es de **consistencia de uso**: solo `reservations/new/page.tsx` normaliza. Las otras cuatro pantallas públicas declaraban `api.get<Disciplina[]>("/disciplines")`, que no convierte nada: el genérico de TypeScript no transforma el dato, solo le dice al compilador que confíe.

## Goals / Non-Goals

**Goals**
- Que todo el flujo público reciba entidades normalizadas, sin importar la forma del payload.
- Que el conteo de canchas salga de un único helper con una decisión explícita de precedencia.
- Mantener el cambio surgical: nada de refactors de alcance mayor.

**Non-Goals**
- No introducir normalización global dentro de `http-client`. Sería la solución sistémica, pero obliga a un registro endpoint→mapper que hoy no existe y amplifica el riesgo de este fix.
- No tocar las pantallas de admin: ya leen los campos crudos (`_count.canchas`) y funcionan.
- No tocar `TimeSlotGrid`: lee `id_franja`, `hora_inicio`, `hora_fin` y `disponible`, y el endpoint de disponibilidad devuelve esos nombres tal cual.

## Decisions

**D1. Normalizar en el call site, no en `http-client`.**
Se sigue la convención ya establecida en `reservations/new/page.tsx`:

```ts
api.get<unknown[]>("/disciplines").then((list) => list.map(normalizeDisciplina))
```

El tipo de salida pasa a `unknown` justamente para que el compilador exija la normalización: si mañana alguien escribe `api.get<Disciplina[]>` en otra pantalla, el engaño es explícito y visible en el diff.

**D2. Precedencia `_count` sobre el array `canchas`.**
`_count.canchas` es el total real; un array embebido puede venir truncado o paginado en el futuro. El array queda como fallback para las respuestas de detalle, que sí lo traen completo. Ambos casos están cubiertos por `courtCount()`.

**D3. Un helper, tres call sites.**
`courtCount()` se usa en el listado público y en el home. El panel admin mantiene su expresión actual porque su fallback (`"-"` en lugar de `0`) es una decisión de UI propia del admin.

**D4. `CourtStatus` alineado con la base.**
`Cancha.estado` tiene default `"DISPONIBLE"` en el schema, pero el tipo solo declaraba `ACTIVO | INACTIVO | MANTENIMIENTO`. Como `normalizeCancha` hace cast, el error no se veía en compilación: el badge ya lo pintaba bien por `STATUS_TONE.DISPONIBLE`. Se agrega el miembro para que el tipo deje de mentir.

## Risks / Trade-offs

- **Riesgo bajo**: son correcciones de lectura de datos. No se toca lógica de reservas, stock, permisos ni pagos.
- **Trade-off**: queda un patrón repetido (`.then((list) => list.map(normalizeX))`) en lugar de una solución central. Se acepta como deuda consciente: la solución sistémica se puede hacer después, en una change propia, ahora que los call sites están corregidos uno por uno.
- Si algún día `/disciplines` empieza a embebir `canchas`, el listado sigue funcionando gracias al fallback.

## Migration Plan

1. `courtCount()` en `api-mappers.ts`.
2. Normalizar los 4 call sites públicos.
3. `CourtStatus` += `DISPONIBLE`.
4. Verificar: `next build` (24/24), ESLint sin errores, `openspec validate --strict`, y contraste de los normalizadores contra la API real.
5. PR + merge + redeploy de Vercel.

Rollback: revertir el merge. No hay migraciones ni cambios de datos que deshacer.

## Open Questions

- ¿El contador debería ser un endpoint dedicado (`GET /disciplinas/:id/canchas/count`) si el listado crece a decenas de disciplinas? Hoy `_count` alcanza y sale gratis con la consulta.
## Context

OpenSpec 1.12.0 con schema `spec-driven`. Hay 10 changes abiertos y `openspec/specs/` solo contiene `.gitkeep`; la guía de trabajo es `docs/G1-sync-openspec.md`. El `openspec/config.yaml` ya está modificado en el working tree y es la fuente de contexto y reglas: este change no lo reescribe.

Restricciones:

- Solo se tocan artefactos OpenSpec (`openspec/changes/`, `openspec/specs/`, `openspec/changes/archive/`). No se edita `backend/`, `frontend/`, `infra/` ni `docs/`.
- Cada tarea de `tasks.md` termina con un comando de verificación.
- Un conflicto de deltas no se fuerza: se registra y se detiene el apply.
- `openspec archive --yes` permite archivar con tareas abiertas, pero la política de este change es marcar antes lo obsoleto; `--yes` se usa solo para evitar el prompt interactivo cuando las tareas ya están resueltas.

## Goals / Non-Goals

**Goals:**

- Dejar `openspec/specs/` poblado con las capabilities reales del sistema.
- Dejar `openspec list` mostrando solo trabajo realmente abierto.
- Corregir el delta de `restrict-reservations-to-active-users` para que exprese la regla vigente sin un `## REMOVED` sobre un requisito inexistente.
- Archivar en el orden que evita conflictos de deltas.
- Conservar las tareas diferidas de `club-deportivo-reservas` en un change nuevo en lugar de perderlas.

**Non-Goals:**

- Implementar código, tests, E2E ni stubs OpenAPI.
- Reescribir `openspec/config.yaml` o `docs/G1-sync-openspec.md`.
- Cambiar la regla de negocio de invitados (ya está decidida: solo usuarios ACTIVO reservan).
- Actualizar README/AGENTS/`docs/resumen.md` (queda para G2; se anota como tarea obsoleta absorbida).

## Decisions

### 1. `skip_specs: true` para este change

`sync-openspec` no altera comportamiento: elimina changes muertos, corrige tareas y archiva. Los requisitos que aparecerán en `openspec/specs/` ya están escritos en los deltas de los changes que se archivan. Inventar un delta propio violaría la regla de `config.yaml` ("si el change no altera comportamiento, declararlo con skip_specs y explicar el motivo").

- Alternativa descartada: crear una capability `mantenimiento-openspec`. No describe comportamiento del sistema y agrega ruido permanente.

### 2. Conservar `openspec/config.yaml`

Ya contiene `schema`, `context`, `rules` y la clave `githubCopilot`, y refleja la regla de usuarios ACTIVO. Reescribirlo duplicaría trabajo y arriesgaría perder esa clave.

- Alternativa descartada: regenerar el archivo desde una plantilla.

### 3. Baja de changes obsoletos

- `sports-club-reservation-api`: versión vieja de las mismas 4 capabilities que `club-deportivo-reservas`, 0/31. Se elimina con `git rm -r`.
- `api-reservas`: scaffolding vacío que usa `skip_specs` como parche. Se elimina con `git rm -r`.

No se archivan: archivarlos dejaría versiones viejas y un change vacío en el historial visible de `openspec/changes/archive/`. Al ser rama de feature, `git revert` recupera cualquier archivo si hiciera falta.

### 4. Reconciliación de `club-deportivo-reservas` antes de archivar

| Tarea | Acción | Motivo |
|---|---|---|
| 2.5 | Tachar como obsoleta | El esquema autoritativo hoy es Prisma (`backend/prisma/migrations`), no los SQL de `backend/db/`. |
| 3.11–3.15 | Marcar `[x]` con nota "cubierta por `cancelacion-autogestionada`" | El endpoint `DELETE /reservations/:id`, `cancelarReservaAutogestionada()` y sus 4 tests existen en `backend/src/reservas/`. |
| 5.4 | Marcar `[x]` | Se cumple al correr `openspec validate --all --strict` en la verificación final. |
| 5.1–5.3, 5.5–5.8 | Mover a `integracion-validacion` | Son trabajo pendiente de OpenAPI/stubs, integración y E2E; no pertenecen al change que se archiva. |

Convención de tachado: `- [x] 5.1 ~~texto original~~ (obsoleta: motivo)`.

### 5. Change nuevo `integracion-validacion`

Absorbe 5.1–5.3 y 5.5–5.8 con su propio `proposal.md`, `design.md` y `tasks.md`. Se crea durante el apply de este change y queda abierto en `openspec list`.

- Motivo: `docs/G1-sync-openspec.md` indica "pasar a changes nuevos (tests, E2E, CI)" y la aceptación espera ver los changes nuevos en `openspec list`.
- Decisión de contenido: las tareas movidas se copian literalmente, agrupadas en OpenAPI/CI, integración y verificación E2E. Si al redactar su delta aparece un cambio de contrato (p. ej. OpenAPI), ese change define sus specs; `sync-openspec` no las inventa.
- Alternativa descartada: crear tres changes separados (tests, E2E, CI). Más fricción para el mismo trabajo y sin beneficio de revisión.

### 6. Corrección del delta de `restrict-reservations-to-active-users`

Estado actual: `specs/reservas/validacion-usuario-activo/spec.md` con `## ADDED Requirements` (reserva requiere usuario activo; límite de 2) y un `## REMOVED Requirements` sobre "Reservas para invitados sin cuenta", requisito que no existe en ningún spec.

Decisión: reemplazar ese archivo por `specs/gestion-reservas-turnos/spec.md` con:

- `## MODIFIED Requirements` → "Validación XOR de propietario de reserva": la reserva pertenece a exactamente una `Persona` que es un `Usuario` registrado con `estado = 'ACTIVO'`; se elimina el XOR socio/invitado.
- `## ADDED Requirements` → "Límite de dos reservas confirmadas por usuario activo" (se conserva el requisito actual, que no existe en el spec base).
- Se elimina el bloque `## REMOVED` y el directorio `specs/reservas/validacion-usuario-activo/`.

- Motivo: `## MODIFIED` sí coincide con el requisito existente en `gestion-reservas-turnos` (se archiva después de `club-deportivo-reservas`, así que el spec base ya existe). Evita crear una capability duplicada `reservas/validacion-usuario-activo`.
- Alternativa descartada: conservar el archivo actual y agregar el delta MODIFIED. Dejaría dos capabilities describiendo la misma regla y ensuciaría `openspec/specs/`.

### 7. Orden de archivado y sincronización

Orden obligatorio (dependencias de deltas y disponibilidad de specs base):

1. `club-deportivo-reservas` → sync. Crea las 4 capabilities base.
2. `cancelacion-autogestionada` → sync. Agrega requisito a `gestion-reservas-turnos`.
3. `restrict-reservations-to-active-users` → sync. Modifica el XOR ya existente.
4. `identidad-visual-logo` → sync. Crea `frontend-branding`.
5. `fix-build-frontend-suspense` → sync. Agrega requisitos a `frontend-app`.
6. `fix-disciplinas-contador-canchas` → sync. Agrega requisitos a `frontend-app`.
7. `despliegue-backend` → sync. Crea `operacion-despliegue` con health/CORS/binding.
8. `despliegue-aws` → **sin sync** (`--skip-specs`). Terraform/App Runner es legado no aplicado y no debe quedar como verdad del sistema.

Comando base por change: `openspec archive <change> --yes` (y `--skip-specs` solo para `despliegue-aws`). Se archiva un change por tarea y se valida después de cada uno, para aislar conflictos.

- Alternativa descartada: `openspec archive` masivo/bulk. Si un delta falla, no se sabría cuál y se rompería el orden.

### 8. Tareas obsoletas por cambio

- `cancelacion-autogestionada`: verificar código/tests con Jest, lint y typecheck; luego marcar 1.1–5.1 como `[x]` (5.1 se cumple al crear el PR de este mismo change, no uno aparte: se anota en la nota).
- `fix-build-frontend-suspense` y `fix-disciplinas-contador-canchas`: marcar 5.x como obsoletas ("ya no se despliega en Vercel; el deploy vigente es EC2 + Caddy"). Antes de archivar, comprobar en producción `https://clubdeportivo.alquilerespunilla.com.ar/login`, `/availability`, `/disciplinas` y `/disciplinas/:id`.
- `despliegue-backend`: marcar 6.1–6.7 como obsoletas (Render/Vercel reemplazados por EC2 + Caddy). Los requisitos de health check, CORS y escucha en `0.0.0.0` siguen vigentes y los cubre la spec.
- `despliegue-aws`: marcar 4.4 como obsoleta (la actualización de README/AGENTS/`docs/resumen.md` pertenece a G2 y el despliegue vigente ya no es App Runner) y 5.1–5.7 como obsoletas (Terraform/App Runner no aplicado). Así el archive no queda con tareas abiertas.

### 9. Sin migración de datos ni cambios en la regla de negocio

La regla "solo usuarios ACTIVO reservan" vive en el trigger `fn_validar_reserva` (PostgreSQL) y ya está implementada. Este change no toca migraciones Prisma ni la aplicación. La decisión de la sección 1 de `docs/G1-sync-openspec.md` se da por confirmada porque `config.yaml` y la BD ya la aplican; README/AGENTS se alinean en G2.

## Risks / Trade-offs

- [Conflicto de deltas al archivar] → Archivar de a uno en el orden fijado y correr `openspec validate --all --strict` después de cada archive. Si falla, no usar `--no-validate`: registrar el error y detenerse.
- [El archive mueve directorios y reescribe specs] → Todo ocurre en una rama `feature/sync-openspec`; rollback con `git checkout -- openspec/` o `git revert` del commit. No hay estado externo.
- [`--skip-specs` en `despliegue-aws` podría ocultar requisitos aún válidos] → Los requisitos vigentes (health, CORS, binding) ya entran por `despliegue-backend`; lo que se omite es Terraform/App Runner/OIDC, que no está aplicado.
- [Marcar tareas como hechas sin verificar el código] → `cancelacion-autogestionada`, `fix-*` y `despliegue-*` se verifican con Jest/lint/typecheck y con smoke checks HTTP antes de tildar. Si una verificación falla, la tarea queda abierta y se reporta.
- [El change nuevo `integracion-validacion` crece demasiado] → Se limita a trasladar las tareas diferidas; su planificación detallada (y sus specs, si hay contrato OpenAPI) se hace al implementarlo.
- [README/AGENTS siguen mencionando invitados] → Fuera de alcance; queda anotado para G2 en la sección de impacto del proposal y en la bitácora.

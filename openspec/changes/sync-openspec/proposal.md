## Why

`openspec/specs/` está vacío aunque el sistema ya está implementado, y hay 10 changes abiertos que mezclan trabajo terminado con tareas obsoletas. Sin specs sincronizadas, la IA y el equipo no tienen una fuente de verdad del comportamiento vigente; y los changes duplicados o vacíos (`sports-club-reservation-api`, `api-reservas`) ensucian `openspec list` y el contexto. Este change de mantenimiento deja OpenSpec consistente antes de planificar el resto del MVP.

## What Changes

- Se conserva `openspec/config.yaml` tal como está en el repo (contexto y reglas ya escritos); no se reescribe.
- Se elimina el change obsoleto `sports-club-reservation-api` (versión vieja de las mismas 4 capabilities, 0/31) y el scaffolding vacío `api-reservas` (solo `.openspec.yaml` con `skip_specs`).
- Se reconcilian las `tasks.md` de los changes restantes según `docs/G1-sync-openspec.md`:
  - `club-deportivo-reservas`: tachar 2.5 (el esquema autoritativo es Prisma), dar por cubiertas 3.11–3.15 por `cancelacion-autogestionada`, y mover 5.1–5.3 y 5.5–5.8 a un change nuevo de integración/validación; 5.4 se cumple al validar.
  - `cancelacion-autogestionada`: verificar el código y los tests existentes, tildar 1.1–5.1.
  - `restrict-reservations-to-active-users`: corregir el delta (quitar `## REMOVED` sobre un requisito inexistente y expresar la regla como `## MODIFIED` de "Validación XOR de propietario de reserva" en `gestion-reservas-turnos`).
  - `fix-build-frontend-suspense` y `fix-disciplinas-contador-canchas`: marcar 5.x como obsoletas (ya no se despliega en Vercel) y archivar.
  - `despliegue-backend`: marcar la sección 6 como obsoleta; los requisitos de health check, CORS y escucha siguen vigentes.
  - `identidad-visual-logo`: archivar (completo).
- Se archivan los changes en el orden indicado en `docs/G1-sync-openspec.md`, sincronizando specs en todos salvo `despliegue-aws`, que se archiva con `--skip-specs` para que Terraform/App Runner no queden como verdad del sistema.
- **No hay cambios de comportamiento ni de contrato de API.** Es mantenimiento de artefactos OpenSpec.

## Capabilities

### New Capabilities

Ninguna. Este change no introduce comportamiento nuevo; por eso declara `skip_specs: true` en `.openspec.yaml`.

### Modified Capabilities

Ninguna. Las capabilities que aparecerán en `openspec/specs/` provienen de sincronizar los deltas ya existentes de los changes que se archivan; `sync-openspec` no agrega requisitos propios.

## Impact

- **OpenSpec**: `openspec/changes/` (bajas, reconciliación de tasks y archivado), `openspec/specs/` (se puebla al archivar), `openspec/changes/archive/`.
- **Documentación**: `docs/G1-sync-openspec.md` es la guía; el change nuevo de integración/validación absorbe las tareas diferidas.
- **Backend / Frontend / Base de datos / Infraestructura**: sin cambios de código. La verificación de `cancelacion-autogestionada` solo ejecuta tests, lint y typecheck existentes.
- **Riesgo**: un conflicto de deltas al archivar. La regla del change es no forzar el archive: registrar el error y detenerse.

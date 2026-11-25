## Why

El repositorio acumula artefactos obsoletos, archivos generados versionados y documentación desalineada con reglas de negocio ya vigentes. Esto genera ruido para mantenimiento y revisión (SOCIO, GERENTE, ADMINISTRADOR), riesgo de usar esquemas SQL históricos por error y fricción en entornos Windows por finales de línea en scripts. Este change de mantenimiento ordena el repositorio sin alterar comportamiento funcional.

## What Changes

- Crear `.gitattributes` con `*.sh text eol=lf` para evitar errores de ejecución de scripts en Windows/Unix.
- Consolidar `backend/db/`: dejar `backend/db/esquema-final.sql` como esquema autoritativo; eliminar `backend/db/esquemaUltimo.sql`, `backend/db/persona.sql` y `backend/db/schema(1).sql`; mover `backend/db/schema.sql` y `backend/db/schema-guada.sql` a `backend/db/historico/`; actualizar los links en `backend/db/Auditoria.md`.
- Sacar `backend/tsconfig.tsbuildinfo` del índice y agregar `*.tsbuildinfo` a `.gitignore` (artefacto regenerable por `typecheck`).
- Sacar del índice las skills de Prisma duplicadas en `.claude/skills/prisma-*/`, `.cursor/skills/prisma-*/` y `.devin/skills/prisma-*/`, agregarlas a `.gitignore`, y conservar `.agents/skills` y `.opencode/skills` como fuentes válidas.
- Actualizar `README.md` y `AGENTS.md`: reemplazar menciones que indiquen que invitados sin cuenta pueden reservar por "solo usuarios ACTIVOS pueden reservar"; quitar de `AGENTS.md` la referencia a `scripts/phase-workflow.sh` (script inexistente).
- Agregar al inicio de `docs/continuar.md` la nota: `Documento histórico; el estado vigente está en openspec/ y AGENTS.md`, sin reescribir el resto.

**No BREAKING:** no hay cambios en contratos de API, reglas de negocio vigentes, código de aplicación ni migraciones de Prisma.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- Ninguna (sin cambios de comportamiento a nivel de specs). Se declara `skip_specs: true` en `.openspec.yaml` porque es un change de mantenimiento, limpieza de archivos, normalización de documentación y control de versión.

## Impact

- **Repositorio / control de versiones:** `.gitattributes`, `.gitignore`, eliminación/movimiento de archivos SQL históricos, desindexado de artefactos y skills duplicadas.
- **Documentación:** `README.md`, `AGENTS.md`, `backend/db/Auditoria.md`, `docs/continuar.md`.
- **Backend / Frontend / Base de datos / Infraestructura:** sin impacto funcional ni cambios de código en `backend/src`, `frontend/src`, `backend/prisma/migrations/` ni infraestructura.
- **Compatibilidad:** `scripts/db-baseline.sh`, `scripts/db-seed.sh` y la migración `0001_baseline` siguen referenciando `backend/db/esquema-final.sql`; los SQL eliminados no tienen referencias activas y permanecen en historial de git.

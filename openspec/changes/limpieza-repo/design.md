## Context

Change de mantenimiento solicitado para limpiar el repositorio sin alterar comportamiento. Ver `proposal.md` (Why/What Changes) para motivación y alcance. Restricciones relevantes: no tocar `backend/src`, `frontend/src` ni `backend/prisma/migrations`; no tocar `docs/migracion-inicial.sql` ni `docs/modelosql.sql`; no usar PowerShell para escribir archivos con acentos (`Set-Content`, `Out-File`, `-replace`); conservar UTF-8 sin BOM y los saltos de línea originales al editar; no ejecutar commit, push ni PR.

Estado actual verificado: `backend/db/` contiene SQL autoritativo e históricos; `backend/db/Auditoria.md` enlaza a `schema.sql` y `schema-guada.sql` con rutas relativas; `backend/tsconfig.tsbuildinfo` está versionado; `.claude/skills/prisma-*`, `.cursor/skills/prisma-*` y `.devin/skills/prisma-*` contienen copias de skills Prisma versionadas mientras `.agents/skills` y `.opencode/skills` deben conservarse; no existe `.gitattributes`; `README.md` y `AGENTS.md` incluyen menciones a invitados/reservas y `AGENTS.md` referencia `scripts/phase-workflow.sh` inexistente; `docs/continuar.md` es un documento histórico sin nota de vigencia.

## Goals / Non-Goals

**Goals:**
- Reducir ruido y ambigüedad del repositorio (SQL históricos, artefactos, duplicados, docs desalineadas) mediante operaciones trazables de git y ediciones acotadas.
- Preservar como fuente autoritativa `backend/db/esquema-final.sql` y los scripts que dependen de él.
- Dejar verificable cada tarea del change con comandos explícitos.

**Non-Goals:**
- Cambiar comportamiento de aplicación, contratos API, reglas de negocio, triggers o migraciones de Prisma.
- Reescribir `docs/continuar.md` más allá de agregar la nota inicial.
- Reorganizar `docs/migracion-inicial.sql`, `docs/modelosql.sql` u otros archivos fuera del alcance definido.
- Crear commits, push o PR.

## Decisions

1. **SQL históricos: eliminar vs archivar según referencia documental**
   - **Decisión:** eliminar con `git rm` `esquemaUltimo.sql`, `persona.sql`, `schema(1).sql`; mover con `git mv` `schema.sql` y `schema-guada.sql` a `backend/db/historico/` y actualizar links de `Auditoria.md`.
   - **Rationale:** los eliminados no tienen referencias activas y permanecen en el historial de git; los movidos siguen siendo referenciados por `Auditoria.md`, por lo que se conservan accesibles con rutas actualizadas.
   - **Alternativas:** eliminar todos (rompería links del documento de auditoría) o mover todos a histórico (mantendría más archivos innecesarios referenciados por nadie).

2. **Artefactos generados y skills duplicadas fuera del índice pero ignoradas**
   - **Decisión:** usar `git rm --cached` / `git rm -r --cached` para desindexar `backend/tsconfig.tsbuildinfo` y las copias de skills Prisma en `.claude/skills/prisma-*`, `.cursor/skills/prisma-*`, `.devin/skills/prisma-*`; agregar `*.tsbuildinfo` y esos patrones a `.gitignore`; conservar `.agents/skills` y `.opencode/skills`.
   - **Rationale:** evita ruido en diffs futuros sin borrar archivos locales útiles y respeta que OpenCode/prisma sync usan `.agents` y `.opencode`.
   - **Alternativas:** borrado físico (riesgo para flujos locales/auto-generación) o solo `.gitignore` sin desindexar (no retira lo ya versionado).

3. **Normalización de fin de línea para scripts shell**
   - **Decisión:** crear `.gitattributes` con `*.sh text eol=lf`.
   - **Rationale:** previene fallos tipo `no such file or directory` al ejecutar scripts en contenedores/entornos Unix desde checkouts Windows.
   - **Alternativas:** corregir `core.autocrlf` localmente (no portable al equipo/CI) o convertir archivos manualmente sin política declarada.

4. **Alineación documental mínima y localizada**
   - **Decisión:** editar solo las menciones necesarias en `README.md` y `AGENTS.md` (invitados sin cuenta no reservan; quitar `scripts/phase-workflow.sh`) y anteponer nota histórica en `docs/continuar.md`.
   - **Rationale:** reduce contradicciones con la regla vigente (`restrict-reservations-to-active-users`) y elimina referencias a scripts inexistentes, sin reescrituras amplias.
   - **Alternativas:** reescritura completa de documentos históricos (alto riesgo, fuera de alcance) o dejar referencias con advertencias dispersas.

5. **Ejecución con herramientas de edición seguras para encoding**
   - **Decisión:** todas las modificaciones de archivos con texto/acentos se harán con herramientas de edición del entorno (no PowerShell `Set-Content`/`Out-File`/`-replace`), en UTF-8 sin BOM, preservando saltos de línea existentes.
   - **Rationale:** evita corrupción de caracteres y cambios de fin de línea accidentales en documentación en español.

**Impacto en capas:** regla de negocio no cambia ni se mueve; no hay impacto en NestJS, triggers PostgreSQL ni migraciones Prisma. Infra/CI: solo política de atributos git y limpieza de versionado.

## Risks / Trade-offs

- [Links rotos en `Auditoria.md` tras mover SQL] → Mitigación: `git mv` a `backend/db/historico/` y actualizar rutas relativas en el mismo change; verificación con `Select-String`/`Test-Path`.
- [Desindexar skills/tsbuildinfo podría sorprender a quien esperaba verlos en git] → Mitigación: se conservan localmente (salvo scripts regenerables) y se documenta el efecto por `.gitignore`; verificación con `git ls-files`.
- [Ediciones de docs pueden introducir encoding o EOL no deseado] → Mitigación: usar herramientas de edición, UTF-8 sin BOM, preservar EOL; verificación por revisión de diff/contenido.
- [Eliminar un SQL que algún script use indirectamente] → Mitigación: decisión basada en búsqueda previa de referencias (`scripts/db-baseline.sh`/`db-seed.sh` usan `esquema-final.sql`; no hay referencias a los eliminados); verificación con `Select-String` antes de cerrar.
- [Cambio amplio de `.gitignore` podría ocultar archivos relevantes] → Mitigación: agregar solo patrones/rutas explícitas solicitadas.

## Migration Plan

1. Crear `.gitattributes` y ajustar `.gitignore`.
2. Reorganizar SQL en `backend/db/` (`git rm`, `git mv`, crear `historico/` implícito por movimiento) y actualizar `Auditoria.md`.
3. Desindexar `tsbuildinfo` y skills duplicadas.
4. Actualizar `README.md`, `AGENTS.md` y `docs/continuar.md`.
5. Ejecutar verificaciones (`Test-Path`, `git ls-files`, `Select-String`, `openspec validate --all --strict`).
6. **Rollback:** revertir cambios del working tree/índice de la rama `chore/limpieza-repo` (no se crean commits en este flujo; si se hicieran, `git revert` del commit de limpieza).

## Open Questions

- Ninguna. Las decisiones de alcance, archivos a conservar/mover/eliminar y formato de notas fueron provistas y verificadas en el repositorio.

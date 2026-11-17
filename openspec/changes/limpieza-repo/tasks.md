## 1. Normalización de control de versiones

- [x] 1.1 Crear `.gitattributes` en la raíz con la regla `*.sh text eol=lf` para scripts shell. Verificación: `Select-String -Path .gitattributes -Pattern '^\*\.sh text eol=lf$'` devuelve la línea esperada.
- [x] 1.2 Actualizar `.gitignore` para agregar `*.tsbuildinfo` y las copias de skills de Prisma `.claude/skills/prisma-*/`, `.cursor/skills/prisma-*/` y `.devin/skills/prisma-*/` (sin afectar `.agents/skills/` ni `.opencode/skills/`). Verificación: `Select-String -Path .gitignore -Pattern '^\*\.tsbuildinfo$|^\.claude/skills/prisma-\*/|^\.cursor/skills/prisma-\*/|^\.devin/skills/prisma-\*/'` muestra las 4 entradas.

## 2. Limpieza de esquema SQL (`backend/db`)

- [x] 2.1 Eliminar del repositorio con `git rm` los SQL históricos no referenciados: `backend/db/esquemaUltimo.sql`, `backend/db/persona.sql`, `backend/db/schema(1).sql`, conservando `backend/db/esquema-final.sql` como autoritativo. Verificación: `Test-Path backend/db/esquema-final.sql` es `True` y `Test-Path backend/db/esquemaUltimo.sql, backend/db/persona.sql, 'backend/db/schema(1).sql'` devuelve `False` para los tres.
- [x] 2.2 Mover con `git mv` `backend/db/schema.sql` y `backend/db/schema-guada.sql` a `backend/db/historico/`. Verificación: `Test-Path backend/db/historico/schema.sql, backend/db/historico/schema-guada.sql` es `True` y `Test-Path backend/db/schema.sql, backend/db/schema-guada.sql` es `False`.
- [x] 2.3 Actualizar los links en `backend/db/Auditoria.md` para apuntar a `historico/schema.sql` y `historico/schema-guada.sql`, preservando UTF-8 sin BOM y saltos de línea originales. Verificación: `Select-String -Path backend/db/Auditoria.md -Pattern 'historico/schema\.sql|historico/schema-guada\.sql'` muestra los links actualizados y `Select-String -Path backend/db/Auditoria.md -Pattern '\]\(\./schema\.sql\)|\]\(\./schema-guada\.sql\)'` no devuelve coincidencias.
- [x] 2.4 Confirmar que no se tocaron archivos fuera de alcance y que los scripts base siguen referenciando el esquema autoritativo. Verificación: `git status --short -- docs/migracion-inicial.sql docs/modelosql.sql backend/prisma/migrations backend/src frontend/src` no muestra cambios, y `Select-String -Path scripts/db-baseline.sh,scripts/db-seed.sh -Pattern 'esquema-final\.sql'` devuelve coincidencias.

## 3. Desindexado de artefactos generados y skills duplicadas

- [x] 3.1 Sacar `backend/tsconfig.tsbuildinfo` del índice con `git rm --cached` sin eliminar el archivo local. Verificación: `git ls-files backend/tsconfig.tsbuildinfo` no devuelve salida y `Test-Path backend/tsconfig.tsbuildinfo` devuelve `True` (el archivo sigue en disco).
- [x] 3.2 Sacar del índice con `git rm -r --cached` las skills Prisma en `.claude/skills`, `.cursor/skills` y `.devin/skills`, conservando `.agents/skills` y `.opencode/skills`. Verificación: `git ls-files .claude/skills .cursor/skills .devin/skills` no devuelve salida y `git ls-files .agents/skills .opencode/skills` sigue devolviendo archivos.

## 4. Alineación de documentación

- [x] 4.1 Actualizar `README.md` para que no afirme que un invitado sin cuenta puede reservar; indicar que solo usuarios ACTIVOS pueden reservar (ajustando la descripción del actor/flujo de invitado según corresponda), con UTF-8 sin BOM y EOL preservados. Verificación: `Select-String -Path README.md -Pattern 'invitad' -CaseSensitive:$false` no muestra la capacidad de reservar sin cuenta y el texto refleja "solo usuarios ACTIVOS pueden reservar".
- [x] 4.2 Actualizar `AGENTS.md`: reemplazar menciones que indiquen que invitados sin cuenta pueden reservar por "solo usuarios ACTIVOS pueden reservar" y quitar toda referencia a `scripts/phase-workflow.sh` (incluida la sección/script documentado), con UTF-8 sin BOM y EOL preservados. Verificación: `Select-String -Path AGENTS.md -Pattern 'invitad' -CaseSensitive:$false` no atribuye reservas a invitados sin cuenta, `Select-String -Path AGENTS.md -Pattern 'phase-workflow'` no devuelve coincidencias, y el texto incluye "solo usuarios ACTIVOS pueden reservar".
- [x] 4.3 Agregar al inicio de `docs/continuar.md` la nota exacta `Documento histórico; el estado vigente está en openspec/ y AGENTS.md` sin reescribir el contenido restante. Verificación: `(Get-Content docs/continuar.md -TotalCount 1 -Encoding UTF8)` contiene la nota indicada.
- [x] 4.4 En `docs/resumen.md`, actualizar la fila que menciona `schema.sql`, `esquemaUltimo.sql` y `persona.sql` como versiones históricas, indicando que están en `backend/db/historico/` (`schema.sql`) o fueron eliminadas (`esquemaUltimo.sql`, `persona.sql`; ver historial de git). Verificación: `Select-String -Path docs/resumen.md -Pattern 'historico'` devuelve la línea actualizada.

## 5. Verificación final del change

- [x] 5.1 Ejecutar validación de OpenSpec para el repositorio. Verificación: `pnpm exec openspec validate --all --strict` finaliza exitoso.
- [x] 5.2 Revisar el diff del working tree para confirmar que no hay cambios en `backend/src`, `frontend/src` ni migraciones de Prisma y que no se realizaron commit/push/PR. Verificación: `git diff --name-only` y `git status --short` no listan rutas bajo `backend/src/`, `frontend/src/` ni `backend/prisma/migrations/`, y no se ejecutaron comandos de commit/push/PR.
- [ ] 5.3 Commit, push de la rama `chore/limpieza-repo` y PR. Queda a cargo del usuario; el apply no debe ejecutar esta tarea.
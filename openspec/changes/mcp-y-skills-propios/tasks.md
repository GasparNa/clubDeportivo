## 1. Configuración MCP

- [x] 1.1 Crear `opencode.json` en la raíz con servidores MCP `filesystem` (local, `@modelcontextprotocol/server-filesystem`, con `cwd` y/o ruta explícita de la carpeta del proyecto como directorio permitido, sin depender de `"."` relativo) y `postgres` (local, `@yawlabs/postgres-mcp`, conexión vía `{env:MCP_POSTGRES_URL}` obligatoria, sin valor por defecto) usando el formato documentado de OpenCode; sin secretos ni credenciales hardcodeadas. Tras crear el archivo, ejecutar `opencode mcp list`; si la versión 1.19.5 no acepta `mcp.servers`, ajustar la configuración al formato aceptado y documentar la diferencia. Verificar que el JSON es válido, contiene solo los servidores requeridos y no incluye GitHub MCP.
- [x] 1.2 Documentar en la tarea/archivo de evidencia el comando `opencode mcp add` usado (si la CLI lo soporta en el entorno) o el comando exacto recomendado para el usuario, para su ejecución y registro posterior.

## 2. Skill auditar-diff

- [x] 2.1 Crear `.opencode/skills/auditar-diff/SKILL.md` con frontmatter YAML (`name: auditar-diff`, `description` obligatoria en una frase indicando cuándo usarla) y cuerpo en español con el checklist solicitado (UTF-8 sin BOM/corruptos, ruido en `pnpm-lock.yaml` o archivos no relacionados, secretos/URLs/credenciales, reglas fail-closed, una prueba por escenario del spec, coincidencia `tasks.md` vs cambios, formato de informe). Verificar que el archivo existe, el `name` coincide con la carpeta y no se modifican skills de OpenSpec.

## 3. Skill armar-descripcion-pr

- [x] 3.1 Crear `.opencode/skills/armar-descripcion-pr/SKILL.md` con frontmatter YAML (`name: armar-descripcion-pr`, `description` obligatoria en una frase indicando cuándo usarla) y cuerpo en español que genere la descripción de PR (secciones Consigna, Qué hace, Cómo probarlo, Autorrevisión, Uso de IA, checklist) a partir de `git diff main...HEAD` y el `tasks.md` del change activo, cerrando con la línea de atribución que pida el entorno. Verificar que el archivo existe, el `name` coincide con la carpeta y no se modifican skills de OpenSpec.

## 4. Documentación y evidencia

- [x] 4.1 Crear `docs/mcp-y-skills.md` explicando MCP (host, cliente, servidor, tool; JSON-RPC 2.0; stdio vs HTTP), servidores configurados y justificación (incluido paquete postgres elegido y por qué), riesgos y mitigaciones, uso/invocación de cada skill, y sección "Evidencia". Aclarar que `MCP_POSTGRES_URL` es obligatoria y que, sin ella, el servidor `postgres` no arranca; documentar que `filesystem` usa `cwd`/ruta explícita (ajustable por máquina, sin depender de `"."`). Incluir pruebas con espacios para evidencia: `opencode mcp list`, filesystem (listar `openspec/changes` y prueba negativa: solicitar lectura de un archivo fuera del proyecto debe ser rechazada), postgres (`SELECT count(*)` de la tabla de reservas con `MCP_POSTGRES_URL` definida) y cada skill sobre el diff actual; dejar espacio para anotar ajuste de formato si 1.19.5 no acepta `mcp.servers`. Verificar que el documento no contiene secretos/tokens/cadenas con clave y está en UTF-8 sin BOM.

## 5. Verificación

- [x] 5.1 Ejecutar `pnpm exec openspec validate --all --strict` y verificar que pasa sin errores relacionados al change.
- [x] 5.2 Realizar revisión de diff propia (`git diff --stat`/archivos tocados) para verificar que no se modifican `backend/`, `frontend/` ni skills existentes de OpenSpec/`.agents`, y que no hay secretos ni encoding corrupto; dejar nota en evidencia si se usó la skill `auditar-diff`.
- [x] 5.3 (Manual, usuario) Ejecutar `opencode mcp list`, realizar las pruebas descritas en `docs/mcp-y-skills.md` (filesystem: listar `openspec/changes` y verificar que solicitar lectura de un archivo fuera del proyecto es rechazada; postgres: con `MCP_POSTGRES_URL` definida, `SELECT count(*)` de la tabla de reservas; invocar cada skill sobre el diff actual) y pegar salidas/capturas en la sección "Evidencia".

## 6. PR

- [ ] 6.1 Preparar rama, commits convencionales y descripción de PR usando la plantilla/secciones requeridas (apoyándose en `armar-descripcion-pr` si aplica); abrir PR con CI en verde, revisión de un compañero y archivar/cerrar el change según flujo del repo. Verificar que la descripción incluye la atribución requerida por el entorno y que el alcance coincide con `tasks.md`.
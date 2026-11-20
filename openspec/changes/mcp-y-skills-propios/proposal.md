## Why

La materia evalúa el uso de MCP y herramientas de IA en el flujo de desarrollo, pero el repositorio no tiene configurados servidores MCP ni skills propias de OpenCode con evidencia verificable. Este cambio de tooling deja esa configuración y documentación listas para evaluación, sin alterar el comportamiento de la API ni del frontend.

## What Changes

- Agregar `opencode.json` en la raíz con configuración MCP local para `filesystem` (restringido a la carpeta del proyecto) y `postgres` (base local de desarrollo vía `{env:MCP_POSTGRES_URL}`), sin commitear secretos.
- Crear dos skills propias en `.opencode/skills/auditar-diff/SKILL.md` y `.opencode/skills/armar-descripcion-pr/SKILL.md`, sin modificar ni borrar las skills existentes de OpenSpec.
- Agregar `docs/mcp-y-skills.md` con conceptos MCP, servidores configurados, riesgos/mitigaciones, uso de las skills y una sección de evidencia con espacios para `opencode mcp list`, pruebas de servidores y pruebas de skills.
- Definir tareas de verificación manual (a ejecutar por el usuario) y de PR; no se modifican `backend/` ni `frontend/`.

## Capabilities

### New Capabilities

- Ninguna. `skip_specs: true` en `.openspec.yaml` porque no hay cambios en el comportamiento observable del sistema ni en contratos de API; es un cambio de tooling, skills y documentación.

### Modified Capabilities

- Ninguna.

## Impact

- **Tooling/configuración:** nuevo `opencode.json` en la raíz (formato de MCP según documentación vigente de OpenCode consultada para 1.19.5).
- **Skills de OpenCode:** nuevas carpetas `.opencode/skills/auditar-diff/` y `.opencode/skills/armar-descripcion-pr/`; no se tocan `.opencode/skills/openspec-*` ni `.agents/skills/*`.
- **Documentación:** nuevo `docs/mcp-y-skills.md`.
- **Backend/frontend/base de datos:** sin cambios de código ni de esquema. La configuración `postgres` apunta solo a una base local de desarrollo mediante variable de entorno.
- **Infra/CI:** sin cambios previstos en workflows; la verificación principal es manual (`opencode mcp list` y pruebas descritas) más validación OpenSpec.
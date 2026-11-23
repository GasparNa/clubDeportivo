## Context

Cambio de tooling sin impacto en comportamiento de API o frontend (ver `proposal.md` - Why). El repo no tiene `opencode.json` en la raíz y no define skills propias fuera de las de OpenSpec en `.opencode/skills/` y las de `.agents/skills/`, que deben preservarse intactas. La materia requiere MCP y skills de IA con evidencia verificable.

Restricciones relevantes: usar formato exacto de OpenCode 1.19.5 según docs oficiales; no commitear secretos/tokens/cadenas con clave; archivos en UTF-8 sin BOM escritos con herramientas de edición; no tocar `backend/` ni `frontend/`.

## Goals / Non-Goals

**Goals:**
- Configurar servidores MCP `filesystem` y `postgres` en `opencode.json` con alcance acotado a desarrollo local.
- Crear skills `auditar-diff` y `armar-descripcion-pr` con frontmatter válido y cuerpo en español, invocables en OpenCode.
- Documentar conceptos, configuración, riesgos, mitigaciones, uso y sección de evidencia en `docs/mcp-y-skills.md`.
- Dejar tareas de verificación manual claras para que el usuario ejecute `opencode mcp list`, pruebe servidores y skills, y capture evidencia.

**Non-Goals:**
- Agregar GitHub MCP u otros servidores.
- Modificar código de aplicación, base de datos, CI/CD, Docker o infraestructura.
- Ejecutar la verificación manual en este entorno si requiere CLI de OpenCode autenticada/conectada o credenciales locales reales; se documenta y se deja al usuario.

## Decisions

### 1. Formato de `opencode.json`
- **Decisión:** Usar el formato documentado en https://opencode.ai/docs/mcp-servers: `mcp.servers.<nombre>` con `type`, `command`/`url`, y opciones soportadas (`environment`, `cwd`, `disabled`, `timeout`, `codemode`, etc.). No usar claves inventadas.
- **Rationale y validación:** El usuario exige verificar formato exacto para OpenCode 1.19.5 en docs oficiales. La documentación vigente muestra el esquema con `mcp.servers`; tras crear `opencode.json` se ejecutará `opencode mcp list`. Si la versión 1.19.5 no acepta `mcp.servers`, se ajustará la configuración al formato aceptado por esa versión y se documentará la diferencia observada (y el comando/salida) en `docs/mcp-y-skills.md` y en la evidencia. Si `opencode mcp add` está disponible, se registrará el comando usado o el recomendado. Se evitará `enabled` (deprecado/legacy en docs actuales) en favor de omitir `disabled` o usar `disabled: false` solo si es necesario.
- **Alternativas:** formato plano `mcp.<nombre>` con `enabled`/`env` visto en blogs antiguos; se descarta como fuente primaria por no ser la doc oficial solicitada.

### 2. Servidor MCP `filesystem`
- **Decisión:** Servidor local `@modelcontextprotocol/server-filesystem` vía `npx -y`, fijando su directorio de trabajo (`cwd`) y/o pasando una ruta explícita de la carpeta del proyecto como directorio permitido. No se dependerá de `"."` relativo.
- **Rationale:** Es el servidor estándar para operaciones de archivos acotadas. Cumple "restringido SOLO a la carpeta del proyecto" con un alcance explícito e independiente del directorio desde el que se lance el proceso.
- **Ruta/cwd:** se configurará `cwd` y/o el argumento de directorio permitido con una ruta explícita del proyecto (no `"."`). Como la ruta absoluta puede variar por máquina, `docs/mcp-y-skills.md` indicará que debe ajustarse al path local del proyecto.
- **Prueba negativa (documentación):** `docs/mcp-y-skills.md` incluirá una prueba en la que solicitar la lectura de un archivo fuera del proyecto debe ser rechazada por el servidor.
- **Alternativas:** exponer múltiples rutas o depender de `"."`; se descartan por principio de mínimo privilegio y por ambigüedad del directorio de ejecución.

### 3. Servidor MCP `postgres`
- **Decisión:** Paquete `@yawlabs/postgres-mcp` ejecutado con `npx -y @yawlabs/postgres-mcp`, configurando la conexión mediante `{env:MCP_POSTGRES_URL}` (mapeada a la variable que el paquete requiera, p.ej. `DATABASE_URL` en `environment`). `MCP_POSTGRES_URL` es obligatoria y, sin ella, el servidor `postgres` no debe arrancar; no se proveerá valor por defecto ni cadena embebida.
- **Rationale:** `@modelcontextprotocol/server-postgres` está archivado/deprecado (última 0.6.2, sin soporte, con historial de bypass de read-only documentado públicamente). `@yawlabs/postgres-mcp` es mantenido activamente, es read-only por defecto (writes opt-in), usa protocolo extendido/consultas parametrizadas y declara postura de seguridad endurecida, alineado con "solo base local de desarrollo" e "idealmente rol de solo lectura". Alternativas evaluadas: `@kaiva/postgres-mcp` (drop-in simple del archivado, menos controles declarados) y `microsoft/postgres-mcp` (preview, más pesado, orientado a otros flujos); `mcp-postgres-server` es opción viable pero `@yawlabs/postgres-mcp` ofrece mejor encaje con el requisito de seguridad/solo lectura por defecto.
- **Mitigación:** documentar que `MCP_POSTGRES_URL` es obligatoria, el uso de rol PostgreSQL de solo lectura y base local; la URL se toma de la variable de entorno sin hardcodearla.
- **Alternativas:** `@modelcontextprotocol/server-postgres` (descartado por deprecación/mantenimiento), `@kaiva/postgres-mcp` (descartado como segunda opción frente a hardening por defecto).

### 4. Skills propias
- **Decisión:** Crear `.opencode/skills/auditar-diff/SKILL.md` y `.opencode/skills/armar-descripcion-pr/SKILL.md` con frontmatter YAML mínimo (`name` igual a carpeta, `description` en una frase) y cuerpo en español.
- **Rationale:** Cumple docs de skills de OpenCode (descubrimiento por `.opencode/skills/<id>/SKILL.md`, `name`/`description` recomendados) y los requisitos de contenido del pedido.
- **Contenido:**
  - `auditar-diff`: checklist (UTF-8 sin BOM/caracteres corruptos; ruido en `pnpm-lock.yaml` o archivos no relacionados; secretos/URLs/credenciales hardcodeadas; reglas fail-closed; una prueba por escenario del spec; coincidencia `tasks.md` vs cambios; formato de informe hallazgo/archivo/gravedad/corrección).
  - `armar-descripcion-pr`: genera descripción con secciones Consigna, Qué hace, Cómo probarlo, Autorrevisión, Uso de IA y checklist a partir de `git diff main...HEAD` y `tasks.md` del change activo; cierra con la línea de atribución que pida el entorno.
- **Alternativas:** ubicar en `.agents/skills/`; se elige `.opencode/skills/` por ser el destino solicitado.

### 5. Documentación y evidencia
- **Decisión:** `docs/mcp-y-skills.md` con secciones: qué es MCP (host/cliente/servidor/tool, JSON-RPC 2.0, stdio vs HTTP), servidores configurados y por qué, riesgos y mitigaciones, qué hace cada skill y cómo invocarla, y Evidencia con placeholders para `opencode mcp list` y resultados de pruebas.
- **Contenido específico:** aclarar que `MCP_POSTGRES_URL` es obligatoria y que, sin ella, el servidor `postgres` no arranca; documentar que el servidor `filesystem` usa `cwd`/ruta explícita del proyecto (ajustable por máquina) y no depende de `"."`.
- **Pruebas descritas:** filesystem (listar `openspec/changes` y prueba negativa: solicitar la lectura de un archivo fuera del proyecto debe ser rechazada), postgres (`SELECT count(*)` de la tabla de reservas, con `MCP_POSTGRES_URL` definida), y cada skill (invocarla sobre el diff actual). Incluir espacio para registrar si `opencode mcp list` requirió ajustar el formato por incompatibilidad con `mcp.servers` en 1.19.5.
- **Rationale:** Hace verificable el entregable para la materia sin exponer secretos.

## Risks / Trade-offs

- [Formato de config difiere en 1.19.5 instalado vs docs web] → Mitigación: seguir docs oficiales consultadas, ejecutar `opencode mcp list` tras crear `opencode.json`; si 1.19.5 no acepta `mcp.servers`, ajustar al formato aceptado y documentar la diferencia y la salida real/comando sugerido.
- [Ruta/cwd explícitos de filesystem varían por máquina] → Mitigación: usar `cwd` y/o ruta explícita del proyecto (nunca `"."` relativo) y documentar en `docs/mcp-y-skills.md` que debe ajustarse al path local; nunca ampliar alcance fuera del proyecto.
- [Paquete MCP postgres requiere variable de entorno con nombre específico y `MCP_POSTGRES_URL` es obligatoria] → Mitigación: mapear `{env:MCP_POSTGRES_URL}` al nombre esperado por el servidor en `environment`, documentar su obligatoriedad y que sin ella el servidor no arranca.
- [Verificación manual depende de entorno local/credenciales] → Mitigación: tarea 5 explícita para el usuario con pasos y espacios de evidencia (incluida prueba negativa de filesystem); no inventar salidas.
- [Texto con encoding incorrecto en Windows] → Mitigación: escribir solo con herramientas de edición en UTF-8 sin BOM.

## Migration Plan

- Crear/actualizar archivos de tooling y docs en una rama de feature; no hay migración de datos ni despliegue.
- Rollback: revertir el commit/PR elimina `opencode.json`, las dos skills y `docs/mcp-y-skills.md` sin efectos en runtime de la app.

## Open Questions

- Ninguna que cambie alcance o enfoque. Detalles menores de portabilidad de ruta/comando exacto de `opencode mcp add` en el entorno del usuario se resolverán y registrarán en la implementación/documentación.
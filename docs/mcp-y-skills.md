# MCP y skills propias (OpenCode)

## 1. Qué es MCP
**MCP (Model Context Protocol)** es un protocolo abierto que estandariza cómo un host de IA se conecta a capacidades externas.

- **Host**: la aplicación donde corre el asistente (en este caso, OpenCode) y que gestiona la sesión, permisos y contexto del usuario.
- **Cliente MCP**: componente del host que abre y mantiene la conexión con cada servidor MCP, negocia capacidades y envía solicitudes.
- **Servidor MCP**: proceso o servicio externo que expone capacidades (herramientas, recursos, prompts u otros elementos) al cliente.
- **Tool (herramienta)**: operación invocable que el servidor expone (por ejemplo, listar archivos o ejecutar una consulta) con entrada/salida definida.

**Protocolo y transporte**
- **JSON-RPC 2.0**: MCP utiliza mensajes JSON-RPC 2.0 para las solicitudes, respuestas y notificaciones entre cliente y servidor.
- **stdio**: transporte local donde el host inicia el servidor como proceso hijo y se comunican por entrada/salida estándar; típico para herramientas locales (npx/node, binarios).
- **HTTP (Streamable HTTP)**: transporte remoto donde el cliente se conecta a una URL/endpoint HTTP del servidor; usado para servicios expuestos en red.

## 2. Servidores configurados y justificación
Configuración en `opencode.json` (raíz), siguiendo el formato documentado de OpenCode (`mcp.servers.<nombre>` con `type: "local"` y `command`).

| Servidor | Tipo | Paquete/comando | Alcance y propósito | Conexión/variables |
| --- | --- | --- | --- | --- |
| `filesystem` | local (stdio) | `npx -y @modelcontextprotocol/server-filesystem` | Acceso a archivos **restringido a la carpeta del proyecto** para lectura/exploración controlada durante el desarrollo. | Se fija `cwd` y se pasa una **ruta explícita** del proyecto como directorio permitido (no se depende de `"."`). La ruta debe ajustarse al path local de la máquina. |
| `postgres` | local (stdio) | `npx -y @yawlabs/postgres-mcp` | Consultas a la **base PostgreSQL local de desarrollo** (solo lectura por defecto del servidor) para verificación/evidencia. | `MCP_POSTGRES_URL` es **obligatoria** y se mapea a `DATABASE_URL` (`{env:MCP_POSTGRES_URL}`); **sin ella el servidor `postgres` no arranca**. No se incluye valor por defecto ni cadena en el repositorio. |

### Paquete PostgreSQL elegido y por qué
Se eligió **`@yawlabs/postgres-mcp`** en lugar de `@modelcontextprotocol/server-postgres` porque este último está archivado/deprecado (sin mantenimiento activo y con antecedentes públicos de bypass del modo de solo lectura en versiones antiguas). `@yawlabs/postgres-mcp` es una alternativa mantenida que, según su documentación, opera en modo de solo lectura por defecto (las escrituras requieren habilitación explícita), usa consultas parametrizadas/protocolo extendido y aplica controles de seguridad adicionales. Como mitigación de alcance, se exige uso de base local de desarrollo y, idealmente, un rol de PostgreSQL de solo lectura.

### Compatibilidad de formato (OpenCode 1.19.5)
- Versión CLI verificada: **OpenCode 1.19.5** (`opencode --version`).
- Tras crear `opencode.json`, `opencode mcp list` reconoció y conectó los servidores con el formato `mcp.servers` (ver Evidencia). **No fue necesario ajustar el formato** por incompatibilidad en esta versión.
- Nota: la ruta explícita configurada para `filesystem`/`cwd` es específica de esta máquina (`C:\Users\Rosso\clubDeportivo`) y debe ajustarse si el proyecto se usa en otro path.

### Comandos de referencia (`opencode mcp`)
- Listar servidores y estado: `opencode mcp list`
- Agregar servidor remoto (forma directa de la CLI): `opencode mcp add <nombre> --url <url>`
- Agregar servidor local: `opencode mcp add <nombre> -- <comando> [args...]` (interactivo/según CLI). En este change la configuración se definió declarativamente en `opencode.json`; si se prefiere gestión por CLI, usar los comandos anteriores y verificar con `opencode mcp list`.

## 3. Riesgos y mitigaciones
| Riesgo | Mitigación |
| --- | --- |
| Exposición de datos fuera del proyecto vía MCP filesystem | Servidor limitado a un único directorio permitido (ruta explícita del proyecto) con `cwd` fijado; no se usan rutas amplias ni `"."` relativo. |
| Exposición o fuga de credenciales de base de datos | `MCP_POSTGRES_URL` es obligatoria y se inyecta por entorno (`{env:MCP_POSTGRES_URL}`); sin valor por defecto ni secretos en el repositorio. |
| Operaciones destructivas o no deseadas en la base | Uso de base **local de desarrollo**, paquete con modo lectura por defecto y recomendación de rol PostgreSQL de solo lectura. |
| Formato de configuración incompatible entre versiones | Validación con `opencode mcp list` y documentación de diferencias/ajustes si 1.19.5 no acepta `mcp.servers`. |
| Skills desactualizadas o con instrucciones inseguras | Skills versionadas en el repo, con alcance acotado y revisión en PR antes de merge. |

## 4. Skills propias y cómo invocarlas
Las skills se ubican en `.opencode/skills/<nombre>/SKILL.md` y no modifican las skills existentes de OpenSpec.

| Skill | Ubicación | Propósito | Cómo invocarla |
| --- | --- | --- | --- |
| `auditar-diff` | `.opencode/skills/auditar-diff/SKILL.md` | Auditar un diff antes de commitear (encoding, ruido/lockfile, secretos, reglas fail-closed, pruebas por escenario, coincidencia con `tasks.md`, formato de informe). | Invocar la skill `auditar-diff` y pedir que audite el diff actual (p. ej. `git diff` / `git diff --staged` o el diff de la rama) indicando el change activo si aplica. |
| `armar-descripcion-pr` | `.opencode/skills/armar-descripcion-pr/SKILL.md` | Generar la descripción de PR con secciones Consigna, Qué hace, Cómo probarlo, Autorrevisión, Uso de IA y checklist a partir de `git diff main...HEAD` y el `tasks.md` del change activo. | Invocar la skill `armar-descripcion-pr` sobre el diff actual y el `tasks.md` del change activo; revisar y completar la atribución requerida por el entorno. |

## 5. Evidencia

### 5.1 `opencode mcp list`
Salida registrada tras crear `opencode.json` (OpenCode 1.19.5, con `MCP_POSTGRES_URL` definida en el entorno para permitir la conexión del servidor `postgres`):

```text
$ opencode mcp list

┌  MCP Servers
│
●  ✓ filesystem connected
│      npx -y @modelcontextprotocol/server-filesystem C:\Users\Rosso\clubDeportivo
│
●  ✓ postgres connected
│      npx -y @yawlabs/postgres-mcp
│
└  2 server(s)
```

- Ajuste de formato requerido por 1.19.5: **No** (aceptó `mcp.servers`).

### 5.2 Pruebas de servidores MCP

**Filesystem — listar `openspec/changes` (esperado: listado de carpetas/archivos del proyecto)**
- Comando/solicitud MCP: listar el contenido de `openspec/changes` mediante el servidor `filesystem`.
- Resultado: herramienta `filesystem_list_directory` [path=`openspec/changes`]; devolvió `archive/`, `casos-de-prueba/`, `ci-endurecido/`, `e2e-playwright/`, `endpoints-faltantes-frontend/`, `integracion-validacion/`, `mcp-y-skills-propios/`, `seguridad-dependencias/`, `sync-openspec/`, `tests-reglas-negocio-bd/`.

**Filesystem — prueba negativa fuera del proyecto (esperado: solicitud rechazada por estar fuera del directorio permitido)**
- Comando/solicitud MCP: solicitar la lectura de un archivo fuera del proyecto (p. ej. una ruta fuera de `C:\Users\Rosso\clubDeportivo`, ajustada al path local configurado).
- Resultado esperado: **rechazado** por el servidor (acceso denegado/fuera del alcance permitido).
- Resultado: herramienta `filesystem_read_text_file` [path=`C:\Windows\win.ini`]; el servidor la rechazó: solo permite acceso dentro de `C:\Users\Rosso\clubDeportivo` y ese archivo está fuera de los directorios permitidos. Resultado: **RECHAZADO** (esperado).

**Postgres — `SELECT count(*)` de la tabla de reservas (requiere `MCP_POSTGRES_URL` definida)**
- Precondición: `MCP_POSTGRES_URL` configurada apuntando a la base PostgreSQL local de desarrollo; sin ella el servidor `postgres` no arranca.
- Consulta: `SELECT count(*) FROM reservas;` (ajustar nombre de tabla/esquema si difiere en el entorno local).
- Resultado: herramientas `postgres_pg_list_tables`, `postgres_pg_list_schemas` y `postgres_pg_readonly` con `SELECT COUNT(*)::bigint AS cantidad_reservas FROM reservas;`. Tablas del esquema public: `_prisma_migrations`, `canchas`, `contactos_persona`, `detalle_alquiler_equipamiento`, `direcciones_persona`, `disciplinas`, `equipamientos`, `franjas_horarias`, `personas`, `registros_auditoria`, `reservas`, `solicitudes_permiso`, `usuarios`. Resultado: 0 filas en reservas (base local de desarrollo sin datos de reservas). Nota: la herramienta `pg_readonly` muestra que el servidor opera en solo lectura por defecto.

### 5.3 Pruebas de skills
**Skill `auditar-diff` sobre el diff actual**
- Invocación: ejecutar la skill `auditar-diff` sobre el diff actual del change.
- Resultado: la skill se cargó (Skill "auditar-diff") y generó un informe con Resumen, Hallazgos (hallazgo/archivo/gravedad/qué corregir) y Verificaciones. Reportó dos hallazgos que resultaron falsos positivos (ver subsección "Límite observado").

**Skill `armar-descripcion-pr` sobre el diff actual**
- Invocación: ejecutar la skill `armar-descripcion-pr` usando `git diff main...HEAD` y el `tasks.md` del change activo.
- Resultado: la skill se cargó (Skill "armar-descripcion-pr") y generó la descripción con las secciones Consigna, Qué hace este cambio, Cómo probarlo, Autorrevisión y Uso de IA.

### 5.4 Notas de verificación
- `opencode mcp list`: ejecutado; servidores `filesystem` y `postgres` en estado **connected** (formato `mcp.servers` aceptado en 1.19.5).
- Revisión de diff propia (5.2): verificado que no se modifican `backend/`, `frontend/`, `.agents/skills` ni skills `openspec-*` existentes; cambios limitados a `opencode.json`, `.opencode/skills/auditar-diff/`, `.opencode/skills/armar-descripcion-pr/`, `docs/mcp-y-skills.md` y `openspec/changes/mcp-y-skills-propios/`. Sin secretos ni indicios de encoding corrupto. Skill `auditar-diff`: invocada en la prueba manual; su resultado y su falso positivo están documentados abajo.
- Pruebas funcionales de herramientas MCP y skills (5.3): ejecutadas manualmente por la usuaria; capturas de pantalla guardadas por separado (mcp-1 a mcp-5).

### Límite observado de la skill auditar-diff
En la prueba 4, la skill reportó mojibake en varios archivos y dijo no poder confirmar la validación de OpenSpec. Verificamos manualmente leyendo los bytes de cada archivo: sin BOM, UTF-8 válido y 0 secuencias anómalas; y openspec validate --all --strict dio 16/16. Conclusión: falso positivo causado por la lectura de archivos con codificación incorrecta en Windows. Las herramientas de IA pueden equivocarse, y cada hallazgo se contrasta con una verificación independiente antes de actuar.
# Design

## Context

Ver `proposal.md` — Why. Hoy `backend/package.json` define `"test": "jest"` con
`rootDir: "src"` y `moduleNameMapper` que reemplaza `@nestjs/*` y
`@prisma/client` por stubs (`backend/stubs`). Esa suite nunca abre una conexión
PostgreSQL, por lo que los triggers de `backend/db/esquema-final.sql` no tienen
cobertura. El esquema es la fuente autoritativa de las reglas de negocio
(1966 líneas, triggers `BEFORE`/`AFTER`), y el stack local ya levanta PostgreSQL
16 en Docker Compose publicado en el puerto **5433**.

No existe `backend/test/` todavía, y `tsconfig.json` solo incluye `src/**/*`.
`pg` no está instalado. La suite nueva debe convivir con la actual sin
modificarla.

## Goals / Non-Goals

**Goals:**

- Ejecutar los triggers reales contra PostgreSQL 16, sin stubs ni mocks.
- Aislar la suite en una base `club_deportivo_test` creada desde
  `esquema-final.sql`, con una negativa explícita a correr sobre cualquier base
  cuyo nombre no termine en `_test`.
- Cubrir, por cada función pedida, al menos un camino feliz y uno de error, con
  datos propios, ids únicos y limpieza, sin depender del orden ni del seed.
- Dejar `pnpm --dir backend run test:db` listo para que otro change lo enchufe
  al CI.

**Non-Goals:**

- No se agrega el job de CI ni se toca `ci.yml` / `cd.yml`.
- No se modifica `backend/src`, `frontend/src`, migraciones de Prisma ni
  `backend/db/esquema-final.sql`.
- No se cambia el script `test` ni el comportamiento de la suite unitaria.
- No se prueban reglas que el esquema no tenga (ver “Omisiones”).
- No se prueban RLS ni la inmutabilidad de `registros_auditoria`: la suite
  conecta como dueña de las tablas, así que ambas son inertes para ella.

## Decisions

### 1. Driver: `pg` en lugar de Prisma Client

Se agregan `pg` y `@types/pg` como devDependencies y se usa un `Pool` de `pg`
directamente.

- **Por qué:** los triggers se ejercitan con SQL plano (INSERT/UPDATE/DELETE y
  `SET LOCAL`), el test de concurrencia necesita conexiones independientes para
  que el advisory lock se comporte de verdad, y el setup necesita conectarse a
  la base administrativa para crear/dropear la base de prueba. Prisma Client no
  aporta nada aquí y agrega fricción con transacciones interactivas.
- **Alternativas descartadas:** Prisma `$queryRaw` (mismas capacidades, más
  capas y límites de pool); invocar `psql` desde Node (dependencia del binario y
  parseo de salida, poco portable).

### 2. Configuración de Jest separada, sin stubs

Archivo `backend/test/db/jest-db.config.js`:

- `preset: 'ts-jest'`, `testEnvironment: 'node'`, `rootDir` = `test/db`.
- `testMatch: ['**/*.db-spec.ts']` para no capturar la suite de `src`.
- **Sin** `moduleNameMapper` (esto es lo que garantiza que no se inyecten los
  stubs de `backend/stubs`).
- `globalSetup: '<rootDir>/global-setup.js'` (JS para evitar problemas de
  transformación del propio global setup).
- `maxWorkers: 1` y `--runInBand` en el script: las pruebas comparten una única
  base y la limpieza es por test, no por transacción serializable.
- `testTimeout: 30000` por la creación de base + esquema.
- `transform` con `ts-jest` y `tsconfig.db.json` (extiende `backend/tsconfig.json`,
  `rootDir: "."` e incluye `test/db/**/*.ts`) porque el `tsconfig` raíz solo
  incluye `src/**/*`.

Script nuevo en `backend/package.json`:

```json
"test:db": "jest --config ./test/db/jest-db.config.js --runInBand"
```

`"test": "jest"` queda intacto.

### 3. Base de prueba efímera y guardia de seguridad

- URL de prueba: `TEST_DATABASE_URL` si existe; si no, el valor por defecto
  `postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo_test`
  (Docker Compose).
- **Nunca** se lee `DATABASE_URL` como fallback: evita apuntar por accidente a la
  base de desarrollo de `backend/.env`.
- `global-setup.js`:
  1. Parsea la URL y valida que el nombre de base termine en `_test`; si no,
     lanza y aborta toda la corrida.
  2. Deriva la URL administrativa reemplazando la base por `postgres`.
  3. `DROP DATABASE IF EXISTS <base> WITH (FORCE)` (PG 13+, la imagen es 16) y
     `CREATE DATABASE <base>`.
  4. Conecta a la base nueva y aplica `backend/db/esquema-final.sql` completo con
     `client.query(sql)` (sin partir el archivo).
  5. Si `DB_TEST_SKIP_SETUP=1`, omite los pasos 2–4 (necesario para la prueba de
     sanidad con un trigger deshabilitado); la validación del nombre (paso 1)
     sigue ejecutándose.
- Además, cada spec ejecuta en `beforeAll` una guardia en runtime:
  `SELECT current_database()` y falla si no termina en `_test`. Son dos capas:
  URL y base conectada.

### 4. Datos y limpieza por test

- Helper `Fixtures` con fábricas que generan ids y valores únicos
  (`crypto.randomUUID()`, DNI aleatorio, email con UUID, nombre de disciplina con
  UUID): `disciplina`, `cancha`, `franja`, `equipamiento`, `persona`,
  `usuarioActivo`, `usuarioSuspendido`, `reserva`, `detalleAlquiler`.
- Cada fábrica registra lo creado. `afterEach` limpia en orden seguro de FK:
  `detalle_alquiler_equipamiento` → `reservas` → `registros_auditoria` →
  `equipamientos` → `franjas_horarias` → `canchas` → `usuarios` → `personas`
  (cascadea `contactos_persona`) → `disciplinas`. Se borran solo ids creados por
  el test; no se hace `TRUNCATE` para no tocar el seed ni otras corridas.
- Fechas y días de la semana se calculan **con SQL** (`CURRENT_DATE +/- n`,
  `EXTRACT(DOW FROM fecha)`), no en JavaScript, para evitar corrimientos de zona
  horaria (`TZ`/`PGTZ` del contenedor es `America/Argentina/Buenos_Aires`).
- Cada test crea su propia disciplina/cancha/equipamiento, así no depende del
  seed ni del orden.

### 5. Reglas derivadas del esquema y matriz de cobertura

Todos los mensajes y umbrales salen de `backend/db/esquema-final.sql` (líneas
indicadas). No se inventan reglas.

#### `fn_validar_reserva` — trigger `trg_validar_reserva` (BEFORE INSERT, `reservas`, L916)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz | Usuario `ACTIVO`, franja con `dia_semana = DOW(fecha)`, cancha `DISPONIBLE`, 0 reservas | Inserta; `monto_total = cancha.precio_base` (L1031) |
| Error: día | `fecha` cuyo DOW ≠ `franja.dia_semana` | `La fecha no corresponde al día de la semana de la franja` (L947) |
| Error: mantenimiento | Cancha `MANTENIMIENTO` | `La cancha se encuentra en mantenimiento` (L971) |
| Error: usuario no activo | Sin fila en `usuarios`, o `estado <> 'ACTIVO'` | `Solo usuarios registrados y activos pueden reservar` (L991). Cubre invitado y suspendido/pendiente |
| Error: límite | Usuario con 2 `CONFIRMADA`, intenta una tercera en otra franja/fecha | `El usuario ya posee el máximo de 2 reservas confirmadas` (L1023) |
| Concurrencia | Usuario con 1 `CONFIRMADA`; dos `INSERT` simultáneos con `Promise.all` sobre dos franjas distintas | Exactamente 1 éxito y 1 error con el mensaje del límite (advisory lock L1006) |

Notas derivadas: el trigger exige usuario `ACTIVO` incluso para insertar (no hay
camino de invitado al crear reservas); no valida fechas pasadas ni solapamiento
horario (el solapamiento lo cubre el índice único parcial
`uq_reserva_franja_fecha_activa`, L874). La concurrencia usa franjas distintas
para no chocar con ese índice y aislar el límite de 2.

#### `fn_actualizar_reserva` — trigger `trg_actualizar_reserva` (BEFORE UPDATE, `reservas`, L1049)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz: transición | `CONFIRMADA → EN_CURSO → COMPLETADA` | Permitido; `actualizado_en` cambia |
| Error: transición | `COMPLETADA → CANCELADA` (o `CANCELADA → CONFIRMADA`) | `Transición de estado inválida: COMPLETADA -> CANCELADA` (L1091) |
| Feliz: cancelación anticipada | `AUTOGESTIONADA`, turno a más de 1 día | Cancela; `cancelado_en` seteado (L1133) |
| Error: anticipación | `AUTOGESTIONADA`, turno ya pasado o a menos de 1 día | `La cancelación requiere al menos 1 día de antelación` (L1125) |
| Feliz: gestión | `MANUAL_GERENCIA` con el mismo turno pasado | Cancela sin restricción de 24 h |

Notas derivadas: la restricción de 24 h aplica solo si `origen =
'AUTOGESTIONADA'` **y** `COALESCE(current_setting('app.actor_rol'), 'SOCIO') =
'SOCIO'` (L1105). Es decir, un actor `GERENTE`/`ADMINISTRADOR` puede cancelar una
`AUTOGESTIONADA` sin antelación; se agrega un caso para fijar ese
comportamiento con `SET LOCAL app.actor_rol = 'GERENTE'`. El borde exacto de
24 h no se prueba (depende del reloj): se usan turnos claramente pasados y
claramente futuros. Solo se permiten `CONFIRMADA → {EN_CURSO, CANCELADA}` y
`EN_CURSO → {COMPLETADA, CANCELADA}`.

#### `fn_validar_alquiler_equipamiento` — trigger `trg_validar_alquiler` (BEFORE INSERT, `detalle_alquiler_equipamiento`, L1224)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz | Reserva de usuario `ACTIVO`; equipamiento de la misma disciplina con `stock_disponible = 5`; `cantidad = 2`; `precio_unitario` NULL | Stock 3; `precio_unitario = precio_alquiler`; `subtotal = precio * 2`; `monto_total` de la reserva recalculado |
| Error: invitado | Reserva creada y luego `DELETE` de la fila `usuarios` (la reserva queda sin cuenta) | `Un invitado no puede alquilar equipamiento` (L1271) |
| Error: no activo | Usuario `SUSPENDIDO` | `El usuario debe estar ACTIVO para alquilar equipamiento` (L1279) |
| Error: disciplina | Equipamiento de otra disciplina | `El equipamiento no corresponde a la disciplina de la cancha` (L1304) |
| Error: stock | `cantidad` > `stock_disponible` | `Stock insuficiente` (L1312) |

Notas derivadas: valida `stock_disponible`, no `stock_total`; toma
`FOR UPDATE` del equipamiento (L1299) y descuenta stock dentro de la misma
transacción. `fn_set_fecha_devolucion` (BEFORE INSERT, L1354) corre junto y setea
`fecha_devolucion_estimada`, pero no es una regla pedida: se usa de forma
indirecta. El caso “invitado” se arma borrando el `usuarios` de una reserva ya
creada, porque `fn_validar_reserva` impide crear reservas para invitados.

#### `fn_gestionar_devolucion` — trigger `trg_gestionar_devolucion` (AFTER UPDATE OF estado_devolucion, L1468)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz: devolución | Detalle `PENDIENTE`, stock descontado; `→ DEVUELTO` | Stock restaurado (L1496), `fecha_devolucion_real` seteada, sin incumplimiento |
| Feliz/error: tardía | Detalle `PENDIENTE`; `→ DEVUELTO_TARDE` | Stock restaurado **y** `incumplimientos_equipamiento + 1` + auditoría `INCUMPLIMIENTO_EQUIPAMIENTO` |
| Error: no devuelto | Detalle `PENDIENTE`; `→ NO_DEVUELTO` | `incumplimientos + 1` y auditoría, **sin** restaurar stock (solo `DEVUELTO`/`DEVUELTO_TARDE` restauran) |
| Umbral | Usuario con `incumplimientos_equipamiento = 2`; tercer `NO_DEVUELTO` | `estado = 'SUSPENDIDO'` + auditoría `USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS` (`>= 3`, L1566) |
| Error: doble devolución | Detalle `NO_DEVUELTO → DEVUELTO` | Restaura stock una vez; no suma otro incumplimiento (solo desde `PENDIENTE`) |

Notas derivadas: el stock se restaura para `DEVUELTO` y `DEVUELTO_TARDE`
(`OLD ∈ {PENDIENTE, NO_DEVUELTO}`); `NO_DEVUELTO` deja el stock descontado; la
suspensión es `>= 3` y solo actualiza si el usuario no estaba ya suspendido.

#### `fn_liberar_equipamiento_cancelado` — trigger `trg_liberar_equipamiento_cancelado` (AFTER UPDATE OF estado, `reservas`, L1624)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz | Reserva con detalle `PENDIENTE` y stock descontado; `→ CANCELADA` | Stock restaurado y detalle pasa a `CANCELADO` |
| Error/negativo | Detalle ya `DEVUELTO`; cancelar la reserva | No se restaura stock de nuevo ni se toca el detalle |

Notas derivadas: solo actúa si `NEW.estado = 'CANCELADA' AND OLD.estado <>
'CANCELADA'`; no hay lógica para insertar una reserva ya cancelada. Al pasar el
detalle a `CANCELADO`, `fn_recalcular_monto_reserva` deja el monto en el precio
base.

#### `fn_recalcular_monto_reserva` — trigger `trg_recalcular_monto` (AFTER INSERT/UPDATE/DELETE, `detalle_alquiler_equipamiento`, L1404)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz: alta | Reserva con `precio_base = 1000`; detalle `subtotal = 500` | `monto_total = 1500` |
| Feliz: baja | Borrar el detalle | `monto_total = 1000` |
| Error/negativo: cancelado | Detalle `CANCELADO` | Se excluye del `SUM`; `monto_total = precio_base` |

#### `fn_cancha_a_mantenimiento` — trigger `trg_cancha_mantenimiento` (AFTER UPDATE OF estado, `canchas`, L1785)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz | Cancha con reserva `CONFIRMADA` de hoy/futuro; `→ MANTENIMIENTO` | Reserva `→ CANCELADA`, `cancelado_en` seteado y auditoría `CANCHA_A_MANTENIMIENTO` |
| Feliz: sin restricción 24 h | Reserva `AUTOGESTIONADA` de hoy a las 00:00 (inicio ya pasado/`<24 h`) | Se cancela igual: el trigger setea `app.actor_rol = 'ADMINISTRADOR'` (L1797) antes del `UPDATE` |
| Error/negativo | Reserva `CONFIRMADA` con `fecha < CURRENT_DATE`; reserva `EN_CURSO` futura | Ninguna se cancela (solo `CONFIRMADA` con `fecha >= CURRENT_DATE`) |

#### `fn_auditar_reserva` — trigger `trg_auditar_reserva` (AFTER INSERT OR UPDATE OF estado, `reservas`, L1697)

| Caso | Preparación | Resultado esperado |
|---|---|---|
| Feliz: alta | Insertar reserva | Fila `RESERVA_CREADA`, `actor_tipo = 'USUARIO'`, `id_usuario` = persona, `detalle` con `id_persona`, `estado`, `origen` |
| Feliz: cambio | `CONFIRMADA → EN_CURSO` | Fila `RESERVA_CAMBIO_ESTADO` con `estado_anterior` y `estado_nuevo` |
| Error/negativo | `UPDATE reservas SET monto_total = ...` (sin tocar `estado`) | No se inserta auditoría nueva |

### 6. Prueba de sanidad de los tests (trigger deshabilitado)

La prueba de sanidad no puede ser un spec permanente porque el `globalSetup`
recrea la base. Se hace como paso manual documentado en `tasks.md` y en
`docs/tests-db.md`:

1. `ALTER TABLE reservas DISABLE TRIGGER trg_validar_reserva` sobre la base
   `club_deportivo_test`.
2. `DB_TEST_SKIP_SETUP=1 pnpm --dir backend run test:db -- -t "cancha en mantenimiento"`
   (o cualquier test que dependa de `fn_validar_reserva`) debe **fallar**.
3. `ALTER TABLE reservas ENABLE TRIGGER trg_validar_reserva` y repetir: debe
   pasar.
4. Verificar que no quede ningún trigger deshabilitado:
   `SELECT tgname FROM pg_trigger WHERE tgenabled = 'D'`.

### 7. Documentación

Nuevo `docs/tests-db.md` con: requisito (Docker Compose `db` en 5433), variables
(`TEST_DATABASE_URL` opcional), creación automática de la base, guardia `_test`,
comandos (`docker compose up -d db`, `pnpm --dir backend run test:db`),
`DB_TEST_SKIP_SETUP=1`, y el procedimiento de sanidad. No se modifica
`AGENTS.md` ni el README para evitar ruido.

## Omisiones explícitas

- `fn_marcar_no_devueltos`: es una función programable (no trigger) y no está en
  la lista pedida; no se prueba.
- `fn_validar_reserva` no valida fechas futuras, hora ni propiedad de la
  persona; no se agregan tests para reglas inexistentes.
- `fn_actualizar_reserva` no impide cambiar `fecha`/`id_franja`; no se prueba.
- RLS está habilitado pero sin policies y la app/tests conectan como dueñas: la
  suite no puede validar aislamiento. `registros_auditoria` tiene
  `REVOKE UPDATE, DELETE FROM PUBLIC`, pero el dueño puede borrar (lo usa la
  limpieza): la inmutabilidad append-only no es verificable desde esta suite.
- `fn_cancha_a_mantenimiento` no cancela `EN_CURSO` ni reservas pasadas; se
  verifica como caso negativo, no como error.
- El borde exacto de 24 h en cancelaciones no se prueba (reloj real).

## Risks / Trade-offs

- **La suite depende de Docker/PostgreSQL real** → el script no se agrega al CI
  todavía (otro change). Se mitiga con un mensaje de error claro si el puerto
  5433 no responde y con la creación automática de la base.
- **`globalSetup` dropea la base `_test` en cada corrida** → es intencional para
  partir del esquema; la guardia `_test` impide que un error de configuración
  borre la base de desarrollo.
- **Tests de tiempo (cancelación 24 h)** → se evitan bordes; se usan turnos
  pasados (siempre violan) y futuros a más de 7 días (siempre cumplen).
- **El test de concurrencia puede ser sensible al pool** → `runInBand` y un
  `Pool` con `max >= 2`; se usa `Promise.allSettled` y se afirma 1 éxito + 1
  error con el mensaje exacto.
- **Nuevas devDependencies** → se actualiza el lockfile raíz con `pnpm install`;
  no afecta el bundle de producción.
- **Duplicación de mensajes en los asserts** → los mensajes quedan congelados en
  los tests; si cambia el texto de un `RAISE`, el test falla (es el objetivo:
  detectar cambios de contrato).

## Migration Plan

No hay migración de datos ni de esquema. Rollback: borrar `backend/test/db/` y
`docs/tests-db.md`, quitar el script `test:db` y las devDependencies `pg` /
`@types/pg`, y restaurar el lockfile (`git checkout -- pnpm-lock.yaml`).

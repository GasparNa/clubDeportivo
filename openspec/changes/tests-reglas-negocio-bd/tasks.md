# Tasks

> Restricciones del change: no se toca `backend/src`, `frontend/src`,
> `backend/prisma/migrations`, `backend/db/esquema-final.sql`, ni los workflows
> de CI. No hay commit, push ni PR. El script `test` existente no cambia.

## 1. Entorno de pruebas

- [x] 1.1 Agregar `pg` y `@types/pg` a `devDependencies` de `backend/package.json`
  y el script `"test:db": "jest --config ./test/db/jest-db.config.js --runInBand"`,
  sin modificar `"test": "jest"`.
  Verificación: `pnpm install` en la raíz y luego
  `pnpm --dir backend exec node -e "console.log(require('./package.json').scripts.test, require.resolve('pg'))"`
  imprime `jest` y una ruta a `pg`.
- [x] 1.2 Levantar PostgreSQL de Docker Compose y confirmar el puerto 5433.
  Verificación: `docker compose up -d db; docker compose exec -T db pg_isready -U club_deportivo -d club_deportivo`
  responde `accepting connections`.
- [x] 1.3 Crear `backend/test/db/jest-db.config.js` (sin `moduleNameMapper`),
  `backend/test/db/tsconfig.db.json`, `backend/test/db/global-setup.js` y
  `backend/test/db/setup-test-db.js` con: validación de nombre `_test`, drop/create
  de `club_deportivo_test`, aplicación de `backend/db/esquema-final.sql`, y respeto
  de `DB_TEST_SKIP_SETUP=1`.
  Verificación: `pnpm --dir backend run test:db -- --listTests` no devuelve error
  y el `global-setup` crea la base.
- [x] 1.4 Agregar `backend/test/db/db.ts` con el `Pool` (máximo ≥ 2 conexiones),
  la guardia de runtime `SELECT current_database()` que exige sufijo `_test` y los
  helpers de fechas basados en SQL (`CURRENT_DATE`, `EXTRACT(DOW ...)`).
  Verificación: `pnpm --dir backend exec tsc --noEmit -p test/db/tsconfig.db.json`
  compila sin errores.
- [x] 1.5 Agregar `backend/test/db/guard.db-spec.ts` que verifica que la guardia
  acepta `club_deportivo_test` y rechaza `club_deportivo` (caso de error sin
  conectarse a la base de desarrollo).
  Verificación: `pnpm --dir backend run test:db -- guard.db-spec.ts` pasa.

## 2. Helpers de datos y limpieza

- [x] 2.1 Implementar `backend/test/db/fixtures.ts` con fábricas únicas
  (`disciplina`, `cancha`, `franja`, `equipamiento`, `persona`, `usuarioActivo`,
  `usuarioSuspendido`, `reserva`, `detalleAlquiler`) que registren ids creados y
  limpien en orden de FK en `afterEach`.
  Verificación: `pnpm --dir backend run test:db -- guard.db-spec.ts` sigue pasando
  y `pnpm --dir backend exec tsc --noEmit -p test/db/tsconfig.db.json` compila.
- [x] 2.2 Agregar un spec de humo en `backend/test/db/fixtures.db-spec.ts` que crea
  persona/usuario/cancha/franja y confirma que el `afterEach` deja esas tablas sin
  filas propias.
  Verificación: `pnpm --dir backend run test:db -- fixtures.db-spec.ts` pasa.

## 3. `fn_validar_reserva` (`trg_validar_reserva`)

- [x] 3.1 En `backend/test/db/reservas.db-spec.ts`, caso feliz: usuario `ACTIVO`,
  franja con `dia_semana = DOW(fecha)`, cancha `DISPONIBLE`; verificar inserción y
  `monto_total = cancha.precio_base`.
  Verificación: `pnpm --dir backend run test:db -- reservas.db-spec.ts -t "crea una reserva válida"`.
- [x] 3.2 Casos de error: fecha con día distinto al de la franja
  (`La fecha no corresponde al día de la semana de la franja`), cancha en
  `MANTENIMIENTO` (`La cancha se encuentra en mantenimiento`), usuario no
  `ACTIVO`/sin cuenta (`Solo usuarios registrados y activos pueden reservar`) y
  tercera `CONFIRMADA` (`El usuario ya posee el máximo de 2 reservas confirmadas`).
  Verificación: `pnpm --dir backend run test:db -- reservas.db-spec.ts -t "rechaza"`.
- [x] 3.3 Prueba de concurrencia: usuario con 1 `CONFIRMADA`; dos `INSERT` en
  franjas distintas vía `Promise.allSettled`; exactamente 1 éxito y 1 error con el
  mensaje del límite.
  Verificación: `pnpm --dir backend run test:db -- reservas.db-spec.ts -t "concurrencia"`.

## 4. `fn_actualizar_reserva` (`trg_actualizar_reserva`)

- [x] 4.1 Transiciones: `CONFIRMADA → EN_CURSO → COMPLETADA` permitidas;
  `COMPLETADA → CANCELADA` rechazada con
  `Transición de estado inválida: COMPLETADA -> CANCELADA`.
  Verificación: `pnpm --dir backend run test:db -- actualizar-reserva.db-spec.ts -t "transición"`.
- [x] 4.2 Anticipación: reserva `AUTOGESTIONADA` con turno pasado falla con
  `La cancelación requiere al menos 1 día de antelación`; la misma reserva con
  turno a más de 1 día cancela y setea `cancelado_en`.
  Verificación: `pnpm --dir backend run test:db -- actualizar-reserva.db-spec.ts -t "antelación"`.
- [x] 4.3 `MANUAL_GERENCIA` con turno pasado cancela sin restricción; además,
  `AUTOGESTIONADA` con `SET LOCAL app.actor_rol = 'GERENTE'` cancela sin 24 h.
  Verificación: `pnpm --dir backend run test:db -- actualizar-reserva.db-spec.ts -t "MANUAL_GERENCIA"`.

## 5. `fn_validar_alquiler_equipamiento` (`trg_validar_alquiler`)

- [x] 5.1 Caso feliz: equipamiento de la misma disciplina con stock 5 y
  `cantidad = 2`; stock queda en 3, `precio_unitario = precio_alquiler`,
  `subtotal = precio * 2` y se recalcula `monto_total`.
  Verificación: `pnpm --dir backend run test:db -- alquiler.db-spec.ts -t "descuenta stock"`.
- [x] 5.2 Casos de error: invitado (`Un invitado no puede alquilar equipamiento`),
  usuario `SUSPENDIDO` (`El usuario debe estar ACTIVO para alquilar equipamiento`),
  equipamiento de otra disciplina (`El equipamiento no corresponde a la disciplina de la cancha`)
  y stock insuficiente (`Stock insuficiente`).
  Verificación: `pnpm --dir backend run test:db -- alquiler.db-spec.ts -t "rechaza"`.

## 6. `fn_gestionar_devolucion` (`trg_gestionar_devolucion`)

- [x] 6.1 `PENDIENTE → DEVUELTO`: restaura stock, setea `fecha_devolucion_real` y
  no incrementa incumplimientos.
  Verificación: `pnpm --dir backend run test:db -- devoluciones.db-spec.ts -t "DEVUELTO"`.
- [x] 6.2 `PENDIENTE → DEVUELTO_TARDE`: restaura stock, incrementa
  `incumplimientos_equipamiento` y audita `INCUMPLIMIENTO_EQUIPAMIENTO`.
  Verificación: `pnpm --dir backend run test:db -- devoluciones.db-spec.ts -t "DEVUELTO_TARDE"`.
- [x] 6.3 `PENDIENTE → NO_DEVUELTO`: incrementa incumplimientos y audita, pero
  **no** restaura stock.
  Verificación: `pnpm --dir backend run test:db -- devoluciones.db-spec.ts -t "NO_DEVUELTO"`.
- [x] 6.4 Umbral: usuario con `incumplimientos_equipamiento = 2`, tercer
  `NO_DEVUELTO` deja `estado = 'SUSPENDIDO'` y audita
  `USUARIO_SUSPENDIDO_POR_INCUMPLIMIENTOS`.
  Verificación: `pnpm --dir backend run test:db -- devoluciones.db-spec.ts -t "suspende"`.
- [x] 6.5 `NO_DEVUELTO → DEVUELTO`: restaura stock una sola vez y no suma otro
  incumplimiento.
  Verificación: `pnpm --dir backend run test:db -- devoluciones.db-spec.ts -t "doble devolución"`.

## 7. `fn_liberar_equipamiento_cancelado` (`trg_liberar_equipamiento_cancelado`)

- [x] 7.1 Reserva con detalle `PENDIENTE` y stock descontado que pasa a
  `CANCELADA`: se restaura stock y el detalle queda `CANCELADO`.
  Verificación: `pnpm --dir backend run test:db -- liberar-cancelado.db-spec.ts -t "restaura"`.
- [x] 7.2 Caso negativo: detalle ya `DEVUELTO` al cancelar la reserva; no se
  restaura stock de nuevo ni se modifica el detalle.
  Verificación: `pnpm --dir backend run test:db -- liberar-cancelado.db-spec.ts -t "no duplica"`.

## 8. `fn_recalcular_monto_reserva` (`trg_recalcular_monto`)

- [x] 8.1 Alta y baja de detalle: `monto_total = precio_base + subtotal` al
  insertar y vuelve a `precio_base` al borrar.
  Verificación: `pnpm --dir backend run test:db -- recalcular-monto.db-spec.ts -t "suma"`.
- [x] 8.2 Detalle `CANCELADO`: queda excluido del `SUM` y `monto_total` vuelve al
  precio base.
  Verificación: `pnpm --dir backend run test:db -- recalcular-monto.db-spec.ts -t "CANCELADO"`.

## 9. `fn_cancha_a_mantenimiento` (`trg_cancha_mantenimiento`)

- [x] 9.1 Cancha con reserva `CONFIRMADA` de hoy/futuro pasa a `MANTENIMIENTO`:
  la reserva queda `CANCELADA` con `cancelado_en` y se audita
  `CANCHA_A_MANTENIMIENTO`.
  Verificación: `pnpm --dir backend run test:db -- mantenimiento.db-spec.ts -t "cancela"`.
- [x] 9.2 Reserva `AUTOGESTIONADA` de hoy a las 00:00 (inicio ya pasado/`<24 h`)
  también se cancela, confirmando que el trigger setea `app.actor_rol = 'ADMINISTRADOR'`.
  Verificación: `pnpm --dir backend run test:db -- mantenimiento.db-spec.ts -t "24 h"`.
- [x] 9.3 Casos negativos: reserva `CONFIRMADA` con `fecha < CURRENT_DATE` y
  reserva `EN_CURSO` futura no se cancelan.
  Verificación: `pnpm --dir backend run test:db -- mantenimiento.db-spec.ts -t "no cancela"`.

## 10. `fn_auditar_reserva` (`trg_auditar_reserva`)

- [x] 10.1 Alta de reserva: fila `RESERVA_CREADA`, `actor_tipo = 'USUARIO'`,
  `id_usuario` correcto y `detalle` con `id_persona`, `estado` y `origen`.
  Verificación: `pnpm --dir backend run test:db -- auditoria.db-spec.ts -t "RESERVA_CREADA"`.
- [x] 10.2 Cambio de estado `CONFIRMADA → EN_CURSO`: fila
  `RESERVA_CAMBIO_ESTADO` con `estado_anterior` y `estado_nuevo`.
  Verificación: `pnpm --dir backend run test:db -- auditoria.db-spec.ts -t "RESERVA_CAMBIO_ESTADO"`.
- [x] 10.3 Caso negativo: `UPDATE reservas SET monto_total = ...` sin tocar
  `estado` no inserta auditoría.
  Verificación: `pnpm --dir backend run test:db -- auditoria.db-spec.ts -t "no audita"`.

## 11. Documentación

- [x] 11.1 Crear `docs/tests-db.md` con requisitos (Docker Compose en 5433),
  `TEST_DATABASE_URL` opcional, guardia `_test`, comandos `docker compose up -d db`
  y `pnpm --dir backend run test:db`, `DB_TEST_SKIP_SETUP=1` y el procedimiento de
  sanidad.
  Verificación: `Test-Path docs/tests-db.md` devuelve `True` y el documento
  contiene `TEST_DATABASE_URL` y `test:db`.

## 12. Sanidad de la suite (trigger deshabilitado)

- [x] 12.1 Deshabilitar `trg_validar_reserva` en `club_deportivo_test`, correr un
  test dependiente sin recrear la base y confirmar que falla.
  Verificación:
  `docker compose exec -T db psql -U club_deportivo -d club_deportivo_test -c "ALTER TABLE reservas DISABLE TRIGGER trg_validar_reserva;"`
  y luego
  `$env:DB_TEST_SKIP_SETUP="1"; pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"`
  termina con al menos 1 test fallido.
- [x] 12.2 Volver a habilitar el trigger y confirmar que el mismo test pasa.
  Verificación:
  `docker compose exec -T db psql -U club_deportivo -d club_deportivo_test -c "ALTER TABLE reservas ENABLE TRIGGER trg_validar_reserva;"`
  y luego
  `pnpm --dir backend run test:db -- reservas.db-spec.ts -t "cancha en mantenimiento"`
  pasa.
- [x] 12.3 Confirmar que no quedó ningún trigger deshabilitado.
  Verificación:
  `docker compose exec -T db psql -U club_deportivo -d club_deportivo_test -tAc "SELECT count(*) FROM pg_trigger WHERE tgenabled = 'D';"`
  devuelve `0`.

## 13. Verificación final

- [x] 13.1 Correr la suite completa de reglas de negocio.
  Verificación: `pnpm --dir backend run test:db` pasa con todos los specs en verde.
- [x] 13.2 Confirmar que la suite unitaria existente sigue intacta.
  Verificación: `pnpm --dir backend run test` pasa sin cambios de configuración.
- [x] 13.3 Lint, typecheck y OpenSpec.
  Verificación: `pnpm --dir backend run lint; pnpm --dir backend run typecheck; pnpm exec openspec validate --all --strict`
  sin errores.
- [x] 13.4 Confirmar que no se tocaron archivos prohibidos ni workflows de CI.
  Verificación: `git diff --name-only -- backend/src frontend/src backend/prisma/migrations backend/db/esquema-final.sql .github/workflows`
  no devuelve archivos.

> No se incluyen tareas de commit, push, PR ni archivado del change: el pedido
> indica explícitamente detenerse tras la revisión de los artefactos.

# Auditoría del Modelo de Datos — Club Deportivo

Documento de trabajo para revisar en clase la unificación de `backend/db/schema.sql` (v1) y `backend/db/schema-guada.sql` (v2) en `backend/db/esquema-final.sql`, contra la fuente de verdad `docs/modelo-datos.md`.

## 1. Resumen ejecutivo

| Documento | Rol |
|---|---|
| `docs/modelo-datos.md` | Fuente de verdad del modelo de negocio (RF/RNF) |
| `backend/db/schema.sql` (v1) | Borrador con PKs `SERIAL`, más simple, con un bug de concurrencia en `reservas` |
| `backend/db/schema-guada.sql` (v2) | Borrador con PKs `UUID`, triggers de negocio, RLS deny-all, más completo pero con brechas propias |
| `backend/db/esquema-final.sql` | **Esquema definitivo**: toma la base de v2 y corrige/completa con lo mejor de v1 y lo que faltaba en ambos |

## 2. Auditoría comparativa contra `modelo-datos.md`

### 2.1 Bug crítico encontrado en v1 (`schema.sql`)

`reservas` tenía `UNIQUE (id_cancha, id_franja, fecha, estado)`. Esto rompe la reserva de un turno ya cancelado dos veces: dos filas `CANCELADA` con los mismos cuatro valores violan el `UNIQUE`, bloqueando el negocio sin motivo real.

**Corrección:** índice único **parcial** (tomado de v2, validado contra el modelo):
```sql
CREATE UNIQUE INDEX uq_franja_ocupada
    ON reservas (id_franja, fecha)
    WHERE estado IN ('CONFIRMADA', 'EN_CURSO');
```
Solo bloquea el slot cuando está realmente ocupado; `CANCELADA`/`COMPLETADA` no interfieren con reservas futuras sobre el mismo turno.

### 2.2 Reglas de negocio (sección 4 de `modelo-datos.md`) sin cubrir en ningún borrador

Ninguno de los dos borradores implementaba estas reglas a nivel de base de datos; se agregaron como funciones/triggers para garantizar atomicidad (RNF03):

| Regla | Qué exige el modelo | Implementación agregada |
|---|---|---|
| RF12.2 | El equipamiento debe pertenecer a la disciplina de la cancha reservada | `fn_validar_alquiler_equipamiento` |
| RF21.3 | El no socio no alquila equipamiento | `fn_validar_alquiler_equipamiento` (mismo trigger) |
| RF12.3 | Validar stock suficiente y descontarlo de forma atómica antes de confirmar | `SELECT ... FOR UPDATE` sobre `equipamientos` dentro de `fn_validar_alquiler_equipamiento` |
| RF13.2 / RF13.3 | Reponer stock al devolver; marcar `NO_DEVUELTO` tras 24 hs sin devolución | `fn_gestionar_devolucion_equipamiento` (repone stock solo en `DEVUELTO`/`DEVUELTO_TARDE`) + `fn_marcar_no_devueltos()` (job periódico, no hay evento de BD que dispare el paso del tiempo) |
| RF13.4 | 3 incumplimientos → cuenta `SUSPENDIDO` | `fn_gestionar_devolucion_equipamiento`, contador `usuarios.incumplimientos_equipamiento` |
| RF15 | Cancha a `MANTENIMIENTO` → cancela reservas `CONFIRMADA` futuras y libera stock no retirado | `fn_cancha_a_mantenimiento` (no existía en ninguno de los dos borradores) |
| RF14 / RNF05 | Registro de auditoría de eventos relevantes | `fn_auditoria_reserva` (deja rastro automático de alta/cambio de estado de reservas, sin depender de que el backend siempre lo registre) |

### 2.3 Otras discrepancias y correcciones menores

- **Tipos de PK:** v1 usaba `SERIAL` (IDs secuenciales predecibles); v2 usaba `UUID`. Se adoptó `UUID` en todo el esquema final (ver sección 4, brechas de seguridad).
- **Redundancia cancha/franja:** v1 guardaba `id_cancha` directamente en `reservas` además de `id_franja`, lo que permite inconsistencias (que no coincidan). Se adoptó el diseño de v2: `id_cancha` se deriva vía `id_franja → franjas_horarias → canchas`, y se expone en la vista `v_reservas_detalle` para no perder comodidad de consulta.
- **Campos faltantes en v2 recuperados de v1:** `usuarios.fecha_nacimiento`, `usuarios.domicilio`, `disciplinas.descripcion`.
- **Solicitudes de permiso:** se mantuvo el enfoque 1:1 de v2 (`id_usuario_generado` con `UNIQUE` + `CHECK` de coherencia con `estado = 'APROBADA'`), más fiel al ERD de `modelo-datos.md` que el enfoque inverso de v1 (`usuarios.id_solicitud_origen`).
- **Validación de rol del aprobador:** un `CHECK` no puede consultar otra tabla; se mantuvo/confirmó el trigger `fn_check_gestor_rol` de v2 para validar que `id_gestor_aprobador` sea `GERENTE` o `ADMINISTRADOR`.
- **Idempotencia:** el script final agrega `DROP TABLE/VIEW/FUNCTION IF EXISTS ... CASCADE` al inicio, en orden inverso de dependencias, para poder re-ejecutarse en desarrollo sin errores (ninguno de los borradores lo garantizaba del todo).

## 3. Índices agregados para disponibilidad y concurrencia

| Índice | Objetivo |
|---|---|
| `uq_franja_ocupada` (parcial) | Evita doble reserva del mismo turno y sirve de índice rápido de disponibilidad |
| `idx_reservas_fecha` | Búsqueda de reservas por rango de fechas |
| `idx_reservas_usuario_estado` | Contar reservas activas de un socio (RF16) sin escaneo completo |
| `idx_reservas_no_socio` | Búsqueda de reservas de invitados |
| `idx_franjas_cancha_dia` | Armar la grilla de horarios de una cancha por día |
| `idx_canchas_disciplina_estado` | Filtrar canchas disponibles por disciplina en la búsqueda de turnos |
| `idx_detalle_reserva`, `idx_auditoria_actor`, `idx_auditoria_fecha` | Consultas de soporte/auditoría |

## 4. Por qué `esquema-final.sql` debe ser el script definitivo

1. **Es el único que no tiene el bug de re-reserva** descrito en 2.1 (v1 lo tiene; sin corregirlo, el sistema queda inutilizable después de un par de cancelaciones sobre el mismo turno).
2. **Es el único que cubre el 100% de las reglas de negocio documentadas** en `modelo-datos.md` (seis reglas de la sección 4 no estaban en ningún borrador, ver 2.2).
3. **Cumple RNF03 (concurrencia)** de forma explícita con `pg_advisory_xact_lock` (RF16) y `SELECT ... FOR UPDATE` (RF12.3), evitando condiciones de carrera que ni v1 ni v2 resolvían juntas.
4. **Es idempotente y auditable**: puede volver a ejecutarse en cualquier entorno (dev/staging) sin intervención manual, y cada cambio de estado relevante queda registrado.
5. **No pierde información recuperable de ambos borradores** (ver 2.3), evitando tener que elegir entre "el simple" y "el completo".

## 5. Brechas de seguridad contempladas (OWASP Top 10 / buenas prácticas)

| Riesgo | Mitigación en `esquema-final.sql` |
|---|---|
| **IDOR / enumeración de IDs** (A01 Broken Access Control) | PKs `UUID` en vez de `SERIAL`: un ID no se puede adivinar ni iterar secuencialmente desde la API |
| **Acceso no autorizado a filas** (A01) | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` en las 10 tablas, política **deny-all** por defecto (sin `CREATE POLICY` aún): ningún rol de Supabase distinto de `service_role` puede leer/escribir hasta definir políticas explícitas en el backend |
| **Alteración/borrado de evidencia de auditoría** (A01/A09 Security Logging Failures) | `REVOKE UPDATE, DELETE ON registros_auditoria FROM PUBLIC`: la tabla es *solo-append* a nivel de permisos de BD, no solo por convención de la app (RNF05) |
| **Bypass de reglas de negocio accediendo directo a la BD** (A04 Insecure Design) | Reglas críticas (stock, XOR socio/no-socio, máximo de reservas, roles del aprobador) están como `CHECK`/triggers en la BD, no solo validadas en el backend; así no se pueden saltear con un `INSERT` directo o un bug del backend |
| **Condición de carrera / TOCTOU en stock y reservas** (A04, integridad de datos) | `SELECT ... FOR UPDATE` sobre `equipamientos` y `pg_advisory_xact_lock` por socio antes de contar reservas activas, evitando doble alquiler o doble reserva por ejecución concurrente |
| **Datos inconsistentes / inyección de estados inválidos** (A03 Injection-adjacent / validación de entrada) | `CHECK` en todos los campos tipo enum (`rol`, `estado`, `origen`, etc.) y en montos/cantidades (`>= 0`, `> 0`); `NOT NULL` en campos obligatorios; XOR de reservante a nivel de constraint |
| **Credenciales en texto plano** (A02 Cryptographic Failures) | `usuarios.password_hash` documentado como hash (no contraseña en texto plano); se recomienda delegar autenticación completa en Supabase Auth cuando sea posible |
| **Fuga de datos de invitados/duplicados** (A08 Data Integrity Failures) | `no_socios.dni UNIQUE` evita crear registros duplicados del mismo invitado con datos divergentes |
| **Referencias colgantes / borrado inconsistente** (A08) | `FOREIGN KEY` explícitas en toda relación, con `ON DELETE CASCADE` solo donde el modelo lo justifica (ej. `franjas_horarias → canchas`) y sin cascada donde borrar en cadena sería peligroso (ej. `disciplinas`, `usuarios`) |

### Pendiente para la fase de Backend (fuera del alcance de este script)

- Definir las políticas (`CREATE POLICY`) concretas de RLS por rol (`SOCIO`, `GERENTE`, `ADMINISTRADOR`), hoy en modo deny-all.
- Programar el job periódico (`pg_cron` o scheduler de Supabase) que ejecute `fn_marcar_no_devueltos()` (RF13.3).
- Verificar que el backend use siempre la `service_role key` (o un rol autenticado con políticas propias) y nunca la `anon key` para operaciones administrativas.
- Sanitizar/parametrizar cualquier consulta dinámica en el backend (NestJS/Supabase client) para evitar SQL Injection (A03); este esquema no genera SQL dinámico, pero la capa de aplicación debe respetar el mismo principio.

## 6. Archivos de referencia

- Fuente de verdad: [docs/modelo-datos.md](../../docs/modelo-datos.md)
- Borrador v1: [backend/db/schema.sql](./schema.sql)
- Borrador v2: [backend/db/schema-guada.sql](./schema-guada.sql)
- **Esquema final:** [backend/db/esquema-final.sql](./esquema-final.sql)
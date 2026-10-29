# Modelo de Datos - Sistema de Reservas Club Deportivo

Modelo conceptual y físico de la base de datos, basado en el documento
*Requerimientos - Ing. de Software (v5)*. El modelo **físico** está en
`backend/db/schema.sql` (PostgreSQL, compatible con Supabase).

## 1. Diagrama de Entidades y Relaciones (ERD)

```
Disciplina ──1:N──> Cancha ──1:N──> Franja Horaria
                        │
                        └──1:N──> Reserva ──1:N──> Detalle Alquiler Equipamiento
                                      │
                    ┌─────────────────┴─────────────────┐
             1:N ←───                    ────> 1:N
        Usuario / Socio                No Socio (Invitado)
              │
              └──1:N──> Registro de Auditoría (como actor)

Solicitud de Permiso ──1:1──> Usuario (usuario creado a partir de la solicitud)
Gerente/Administrador ──1:N──> Solicitud de Permiso (id_gestor_aprobador)
```

## 2. Entidades del Modelo Físico

Tabla                  | Descripción
-----------------------|-------------------------------------------------------------
`disciplinas`          | Catálogo: Fútbol, Tenis, Pádel (RF01)
`solicitudes_permiso`  | Solicitud de alta de socio, autoregistro o gestionada (RF11)
`usuarios`             | Socios, Gerentes y Administradores (RF06, RF11, RF17, RF19)
`no_socios`            | Invitados con reserva cargada por Gerencia (RF21)
`canchas`              | Cancha con disciplina, superficie, estado y precio (RF01, RF15)
`franjas_horarias`     | Grilla de turnos por cancha (RF02, RF03)
`equipamientos`        | Artículos deportivos con stock y precio de alquiler (RF12, RF13)
`reservas`             | Reserva de una franja por socio o no socio (RF02-RF05, RF07-RF10, RF16-RF18, RF20, RF22)
`detalle_alquiler_equipamiento` | Equipamiento alquilado en cada reserva (RF03.2, RF12, RF13)
`registros_auditoria`  | Eventos de auditoría con actor y fecha (RF14, RNF05)

## 3. Reglas de Negocio Implementadas en el Esquema

### 3.1 XOR de reservante (regla clave)
Toda reserva pertenece exclusivamente a un Socio **o** a un No Socio:
nunca ambos, nunca ninguno.

```sql
CHECK (
    (id_usuario IS NOT NULL AND id_no_socio IS NULL)
    OR
    (id_usuario IS NULL AND id_no_socio IS NOT NULL)
)
```

### 3.2 Estados permitidos (CHECK constraints)

- **usuarios.rol**: `SOCIO`, `GERENTE`, `ADMINISTRADOR`
- **usuarios.estado**: `PENDIENTE`, `ACTIVO`, `SUSPENDIDO`
- **solicitudes_permiso.estado**: `PENDIENTE`, `APROBADA`, `RECHAZADA`
- **solicitudes_permiso.origen**: `AUTOREGISTRO`, `GESTIONADA_POR_PERSONAL`
- **canchas.estado**: `DISPONIBLE`, `MANTENIMIENTO`
- **reservas.estado**: `CONFIRMADA`, `EN_CURSO`, `COMPLETADA`, `CANCELADA`
- **reservas.origen**: `AUTOGESTIONADA`, `MANUAL_GERENCIA`
- **detalle_alquiler_equipamiento.estado_devolucion**: `PENDIENTE`, `DEVUELTO`, `DEVUELTO_TARDE`, `NO_DEVUELTO`

### 3.3 Unicidades e integridad

- `usuarios.email` y `usuarios.dni` únicos.
- `solicitudes_permiso.email` único.
- Una cancha no repite nombre dentro de su disciplina.
- No se repite la misma franja horaria para la misma cancha.
- No existe más de una reserva con el mismo estado sobre la misma
  cancha + franja + fecha (evita doble reserva de la misma franja).

## 4. Lógica de Negocio (validada a nivel de aplicación)

Estas reglas **no** son CHECKs de BD; se validan en el backend (NestJS):

Requisito | Regla
----------|------------------------------------------------------------------
RF07      | No se reserva una franja cuya fecha/hora de inicio ya transcurrió.
RF08      | Anticipación máxima de reserva: **30 días** (asumido).
RF09      | Cancelación por autogestión hasta **24 hs** antes del inicio; Gerente/Admin puede cancelar siempre.
RF10      | El mismo socio no solapa reservas (misma cancha + franja + fecha).
RF16      | Máximo **2** reservas `CONFIRMADA` simultáneas por socio (asumido).
RF17.1    | Usuario `PENDIENTE` no puede reservar ni alquilar.
RF17.2    | Usuario `SUSPENDIDO` no crea reservas nuevas (sí consulta/cancela).
RF12.1    | Cantidad de equipamiento entero > 0.
RF12.2    | El equipamiento debe pertenecer a la disciplina de la cancha.
RF12.3    | Stock suficiente antes de confirmar (validación atómica, RNF03).
RF13.1    | `fecha_devolucion_estimada` = fin de franja + **15 min** (asumido).
RF13.2    | Devolución real: `DEVUELTO` / `DEVUELTO_TARDE`.
RF13.3    | Sin devolución en **24 hs** post-franja → `NO_DEVUELTO`, no repone stock automáticamente.
RF13.4    | **3** incumplimientos → cuenta `SUSPENDIDO`; solo Administrador reactiva.
RF15      | Cancha a `MANTENIMIENTO` → cancela reservas `CONFIRMADA` futuras y libera stock no retirado.
RF18      | Check-in: `CONFIRMADA` → `EN_CURSO` → `COMPLETADA` (Secretaría).
RF20.2    | Reserva manual respeta las mismas validaciones (no "forzar").
RF21.3    | No socio no alquila equipamiento (asumido).
RF21.4    | RF08/RF16 no se auto-aplican a reservas de no socios (asumido).

## 5. Notas de Implementación (Supabase)

- Los enums se modelan como `TEXT` + `CHECK` para permitir evolución sin
  migraciones destructivas.
- **Concurrencia (RNF03):** la inserción de la reserva, la validación de
  stock y el descuento de stock deben ocurrir en una **transacción única**
  con `SELECT ... FOR UPDATE` sobre la franja y/o el equipamiento.
- **RLS:** las políticas de fila (Row Level Security) por rol se configuran
  en la Fase de Backend (RF06.3).
- `registros_auditoria` debe ser **solo append** (sin UPDATE/DELETE desde la
  app) para cumplir RNF05.

## 6. Cómo Ejecutar

1. En Supabase: **SQL Editor** → pegar el contenido de `backend/db/schema.sql`
   → **Run**.
2. O local: `psql -d <tu_base> -f backend/db/schema.sql`
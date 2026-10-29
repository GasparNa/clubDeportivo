## Context

See `proposal.md`. El backend ya cancela reservas vía `PATCH /reservations/:id/status`, restringida a `GERENTE`/`ADMINISTRADOR`, con validación de anticipación de 24 h para reservas `AUTOGESTIONADA`. El JWT (`jwt.strategy.ts`) provee `id_usuario` y `rol`, y la reserva apunta a `id_persona` (relación `Usuario.persona`).

## Goals / Non-Goals

**Goals:**
- Exponer la cancelación al Socio titular con las validaciones existentes, sin duplicar lógica.

**Non-Goals:**
- No cambiar la cancelación por gestores, el anti-solapamiento, el esquema ni el frontend.

## Decisions

- **Endpoint**: `DELETE /api/v1/reservations/:id` (idempotente en intención) en lugar de un `POST /cancel`, por ser la semántica REST natural; la cancelación por gestores se mantiene en el `PATCH` actual.
- **Guardas**: `AuthGuard('jwt')` + `SuspendedUserGuard` (el socio suspendido no cancela).
- **Titularidad**: resolver `id_persona` del usuario desde `usuario.id_persona` y compararlo con `reserva.id_persona`; si no coincide → `ForbiddenException`. Alternativa considerada: comparar contra el `id_persona` del token; descartada porque el token no lo incluye.
- **Reuso**: extraer la validación de anticipación a `validarAnticipacionCancelacion()` (privada) usada por el `PATCH` actual y por el nuevo `DELETE`.
- **Transición**: solo `CONFIRMADA -> CANCELADA` para el socio (no permite cancelar turnos en curso/completados).

## Risks / Trade-offs

- La comparación horaria usa `setHours` local sobre horas UTC de la franja (comportamiento existente, se preserva) → Mitigación: tests con franja +5 días para no depender de la hora local.
- `DELETE` con repetición: cancelar una reserva ya `CANCELADA` devuelve 400 en vez de 204 silencioso → Aceptado por claridad de errores.

## Migration Plan

- Sin migración de datos. El despliegue es el del módulo backend (código + tests).

## Open Questions

- Ninguna que bloquee: la política de 24 h ya está fijada en el código y las tasks del frontend la muestran.
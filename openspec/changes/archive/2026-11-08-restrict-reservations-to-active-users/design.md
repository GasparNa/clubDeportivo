## Context

Ver `proposal.md` - Why. Estado actual: el trigger `fn_validar_reserva` en `backend/db/esquema-final.sql` (líneas 916-1038) permite reservas para invitados (`v_estado_usuario IS NULL` pasa la validación). El límite de 2 reservas solo se aplica cuando `v_estado_usuario = 'ACTIVO'`. Las reservas referencian `personas.id_persona` directamente, no `usuarios`.

## Goals / Non-Goals

**Goals:**
- Modificar validación a nivel BD para rechazar reservas sin usuario ACTIVO
- Añadir validación en capa de aplicación (servicio NestJS) como defensa en profundidad
- Proteger endpoints y rutas frontend para usuarios no autenticados/no activos
- Mantener integridad de reservas existentes de invitados (no migración destructiva)

**Non-Goals:**
- Migración de datos de reservas históricas de invitados
- Cambios en alquiler de equipamiento (ya bloquea invitados)
- Cambios en autenticación/registro de usuarios (Fase 1 completada)

## Decisions

### 1. Validación principal en trigger de BD (single source of truth)
**Decisión**: Modificar `fn_validar_reserva` para que falle si `v_estado_usuario IS NULL OR v_estado_usuario <> 'ACTIVO'`

**Rationale**: 
- La BD es la fuente autoritativa (reglas de negocio en triggers)
- Garantiza consistencia aunque se omita validación en app
- Patrón ya establecido en el proyecto (triggers para validaciones críticas)

**Alternativa considerada**: Validar solo en aplicación
- Rechazado: riesgo de bypass vía SQL directo o microservicios futuros

### 2. Defensa en profundidad en servicio NestJS
**Decisión**: Añadir guard/validación en `ReservasService.create()` antes de insert

**Rationale**:
- Errores más claros para API (403 vs 500 de trigger)
- Permite mensajes de error localizados
- Buena práctica: validar temprano, validar en BD

### 3. Frontend: AuthGuard + ActiveUserGuard
**Decisión**: Proteger rutas `/reservations/new` y `/my-reservations` con:
- `AuthGuard` (JWT válido)
- `ActiveUserGuard` (verifica `rol === 'SOCIO' && estado === 'ACTIVO'` en payload JWT)

**Rationale**: 
- UX: redirigir a login/perfil en lugar de error 403 crudo
- Consistente con middleware de autorización por rol (tarea 1.5 completada)

### 4. Sin migración de datos para reservas existentes de invitados
**Decisión**: Las reservas `MANUAL_GERENCIA` de invitados existentes permanecen válidas

**Rationale**:
- No hay requisito de cancelar reservas históricas
- Solo se bloquean NUEVAS reservas
- Simplicidad operativa

## Risks / Trade-offs

| Riesgo | Mitigación |
|--------|------------|
| Gerentes pierden capacidad de reservar para walk-ins | Documentar cambio; walk-ins deben registrarse primero (autoregistro + aprobación gerente) |
| Error 500 si trigger falla antes que validación app | Validar en servicio ANTES de insert; trigger como última barrera |
| Tests existentes fallan (esperan invitados válidos) | Actualizar tests en tasks.md (incluido) |
| Race condition en límite 2 reservas | Ya resuelto con `pg_advisory_xact_lock` en trigger actual |

## Migration Plan

1. **BD**: Modificar `fn_validar_reserva` en `esquema-final.sql` (cambio de trigger)
2. **Backend**: Actualizar `ReservasService.create()` + tests unitarios
3. **Frontend**: Añadir `ActiveUserGuard` a rutas de reserva + tests E2E
4. **Deploy**: Aplicar migración BD → deploy backend → deploy frontend (orden crítico)
5. **Rollback**: Revertir trigger BD + revertir código app (sin migración de datos, rollback es seguro)

## Open Questions

- ¿Se necesita endpoint específico para que gerentes verifiquen si una persona puede reservar (tiene usuario ACTIVO)? → Decidir en implementación
- ¿Mensaje de error específico para "usuario no existe" vs "usuario no ACTIVO"? → Usar mensaje unificado por seguridad (no revelar existencia de usuario)

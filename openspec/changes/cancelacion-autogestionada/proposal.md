## Why

El módulo de reservas permite a GERENTE/ADMINISTRADOR cancelar reservas (`PATCH /reservations/:id/status`), pero el **Socio no puede cancelar su propia reserva** desde el sistema. La regla de negocio ya exige cancelación con 24 h de anticipación para reservas autogestionadas (lo valida el backend); falta exponerla al Socio como funcionalidad propia (la consigna pide cancelación de reservas en el contrato de API).

## What Changes

- Nuevo endpoint **`DELETE /api/v1/reservations/:id`** para que el Socio cancele **su propia** reserva autogestionada.
- Reutiliza la política existente: transición a `CANCELADA`, validación de anticipación mínima de 24 h sobre la franja y registro de `cancelado_en`.
- El Socio solo puede cancelar reservas que le pertenecen; un intento sobre reserva ajena se rechaza (403).
- No modifica la cancelación por gestores (sigue en `PATCH /reservations/:id/status`) ni toca el anti-solapamiento ni el esquema de datos.

## Capabilities

### New Capabilities
- Ninguna (el contrato vive en la capability existente de reservas).

### Modified Capabilities
- `gestion-reservas-turnos`: se agrega el requirement **Cancelación autogestionada de reservas** (endpoint `DELETE /reservations/:id` para el socio titular, con política de 24 h).

## Impact

- **API**: nuevo endpoint `DELETE /api/v1/reservations/:id` (autenticado, requiere `SuspendedUserGuard`).
- **Backend**: `backend/src/reservas/reservas.controller.ts` (nueva ruta) y `reservas.service.ts` (método `cancelarReservaAutogestionada` + refactor de la validación de anticipación para reuso).
- **Tests**: casos en `backend/src/reservas/reservas.service.spec.ts`.
- **Datos/otros**: sin cambios (no toca esquema, triggers ni frontend).
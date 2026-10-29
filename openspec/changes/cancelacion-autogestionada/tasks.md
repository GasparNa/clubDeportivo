## 1. Especificación OpenSpec

- [ ] 1.1 Crear el change `cancelacion-autogestionada` con la schema spec-driven (proposal.md, spec delta en `gestion-reservas-turnos`, design.md, tasks.md) y verificar que `openspec status --change cancelacion-autogestionada` reporta los 4 artifacts en `done`

## 2. Backend — Service

- [ ] 2.1 Extraer la validación de anticipación de `actualizarEstadoReserva` a un método privado `validarAnticipacionCancelacion()` y verificar que el flujo `PATCH /reservations/:id/status` con `CANCELADA` sigue pasando los tests existentes
- [ ] 2.2 Implementar `cancelarReservaAutogestionada(id, userId)` en `reservas.service.ts` (titularidad vía `usuario.id_persona`, estado `CONFIRMADA`, política 24 h, update a `CANCELADA` con `cancelado_en`) y verificar que los tests unitarios de la nueva feature pasan

## 3. Backend — Controller

- [ ] 3.1 Agregar la ruta `DELETE /reservations/:id` con `AuthGuard('jwt')` + `SuspendedUserGuard`, pasando `req.user.id_usuario`, y verificar que el build (`nest build` / typecheck) compila

## 4. Tests

- [ ] 4.1 Agregar casos en `reservas.service.spec.ts`: cancelación exitosa, reserva ajena (403), sin anticipación (400) y estado no CONFIRMADA (400), y verificar que `pnpm test` pasa en el workspace de backend
- [ ] 4.2 Correr `pnpm run lint` y `pnpm run typecheck` en backend sin errores

## 5. Entrega

- [ ] 5.1 Revisar juntos el diff y decidir cuándo crear el PR de `feature/cancelacion-autogestionada` contra `main`
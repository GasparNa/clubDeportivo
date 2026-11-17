## 1. DTO y controlador

- [x] 1.1 Hacer `id_persona` opcional en `CreateReservaDto` (`@IsOptional()` + `@IsUUID()`) en `backend/src/reservas/dto/reservas.dto.ts`. Verificar con `cd backend && pnpm run typecheck` que ningún consumidor depende de que sea obligatorio.
- [x] 1.2 Cambiar `ReservasController.crearReserva` para pasar `req.user` completo al servicio: `this.reservasService.crearReserva(dto, req.user)`, manteniendo `@UseGuards(AuthGuard('jwt'), ActiveUserGuard)`. Verificar con `cd backend && pnpm run typecheck`.

## 2. Servicio: titularidad y origen por rol

- [x] 2.1 Cambiar la firma de `ReservasService.crearReserva` a `(dto: CreateReservaDto, actor?: ActorReserva)` y agregar el chequeo fail-closed inicial: si falta `actor` o `actor.id_usuario` → `ForbiddenException('Se requiere autenticación')` antes de cualquier llamada a Prisma. Verificar con typecheck.
- [x] 2.2 Rama SOCIO (todo actor que no es gerencia según `esGerencia`): si `dto.origen === 'MANUAL_GERENCIA'` → `ForbiddenException('Solo gerencia puede crear reservas manuales')`; si `dto.id_persona` está presente y difiere de `actor.id_usuario` → `ForbiddenException('No puedes crear reservas a nombre de otro usuario')`; titular efectivo `dto.id_persona ?? actor.id_usuario` y origen forzado `AUTOGESTIONADA`. Ambos rechazos ocurren antes de consultar la base. Verificar con typecheck.
- [x] 2.3 Rama GERENTE/ADMINISTRADOR: `id_persona` obligatorio → si falta, `BadRequestException('Gerencia debe indicar el titular de la reserva')`; origen `dto.origen ?? 'AUTOGESTIONADA'` sin restricción adicional. Verificar con typecheck.
- [x] 2.4 Usar el titular y origen efectivos en las validaciones vigentes y en `prisma.reserva.create` (franja y día de semana, cancha sin mantenimiento, conflicto, usuario ACTIVO, límite de 2 reservas — sin cambios de lógica). Verificar con `cd backend && pnpm run test` (tests existentes de crearReserva ajustados al nuevo contrato).

## 3. Tests de servicio (escenarios de RF-RES-10)

- [x] 3.1 SOCIO ACTIVO crea reserva con su propio `id_persona` → se crea la reserva con origen `AUTOGESTIONADA` (mocks de franja, conflicto y usuario activo). Test pasa.
- [x] 3.2 SOCIO ACTIVO crea reserva sin `id_persona` → se crea la reserva con `id_persona` igual al `actor.id_usuario` y `origen AUTOGESTIONADA`. Test pasa y afirma el valor pasado a `prisma.reserva.create`.
- [x] 3.3 SOCIO envía el `id_persona` de otro usuario → `ForbiddenException('No puedes crear reservas a nombre de otro usuario')` y ningún método de Prisma invocado (`expect(prisma.franjaHoraria.findUnique).not.toHaveBeenCalled()` y equivalentes). Test pasa.
- [x] 3.4 SOCIO envía `origen: MANUAL_GERENCIA` → `ForbiddenException('Solo gerencia puede crear reservas manuales')` y ningún método de Prisma invocado. Test pasa.
- [x] 3.5 GERENTE crea reserva `MANUAL_GERENCIA` para un SOCIO ACTIVO → se crea la reserva con el `id_persona` indicado y ese origen. Test pasa.
- [x] 3.6 GERENTE usa el `id_persona` de un usuario no ACTIVO → `ForbiddenException` con el error vigente ('El usuario debe estar ACTIVO para reservar'). Test pasa.
- [x] 3.7 Fail-closed: `crearReserva` sin actor o con actor sin `id_usuario` → `ForbiddenException` antes de cualquier consulta (asserts de mocks de Prisma sin llamadas). Test pasa.
- [x] 3.8 Reglas vigentes con actor SOCIO: límite de 2 reservas confirmadas y franja ya reservada siguen devolviendo los errores vigentes (`BadRequestException` / `ConflictException`). Test pasa.
- [x] 3.9: test de servicio. GERENTE con id_persona sin cuenta (el mock de usuario.findUnique devuelve null) lanza ForbiddenException con "Solo usuarios registrados y activos pueden reservar". El test pasa.
- [x] 3.10 (opcional): actor con rol desconocido o ausente se trata como SOCIO (rama restrictiva). El test pasa.

## 4. Tests de controlador (patrón de `reservas.controller.spec.ts`)

- [x] 4.1 Agregar `describe('POST reservations')` en `backend/src/reservas/reservas.controller.spec.ts`: `guardsDe('crearReserva')` debe incluir un `AuthGuard('jwt')` (helper `esAuthGuardJwt`) y a `ActiveUserGuard` (comparación directa). Cubre el escenario 401 sin token y el guard de usuario activo. Test pasa.
- [x] 4.2 En el mismo describe: `controller.crearReserva(dto, req)` debe llamar al servicio con `(dto, req.user)` exactamente (`toHaveBeenCalledWith`). Test pasa.

## 5. Verificación final

- [x] 5.1 Ejecutar y dejar en verde: `cd backend && pnpm run lint && pnpm run typecheck && pnpm run test`, y `openspec validate --all --strict` desde la raíz.

## 6. Entrega — a cargo del usuario (no ejecutar en el apply)

- [ ] 6.1 Commit, push de la rama y PR. Queda a cargo del usuario; el apply no debe ejecutar esta tarea.

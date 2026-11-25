## Context

`POST /api/v1/reservations` está protegido por `AuthGuard('jwt')` y `ActiveUserGuard`, pero `ReservasController.crearReserva` solo pasa `req.user?.id_usuario` al servicio y ese parámetro no se usa: la titularidad (`dto.id_persona`) y el origen (`dto.origen`) llegan del cuerpo de la petición sin validación contra el token. `req.user` ya expone `id_usuario` y `rol` (ver `backend/src/auth/jwt.strategy.ts`), y el servicio ya define la interfaz `ActorReserva { id_usuario?, rol? }` con el helper privado `esGerencia`, usados hoy por los endpoints de alquileres. Ver `proposal.md` (Why) y `specs/gestion-reservas-turnos/spec.md` (RF-RES-10) para el comportamiento requerido.

## Goals / Non-Goals

**Goals:**

- Derivar titularidad y origen de la reserva del actor autenticado (`req.user`), con reglas por rol.
- Fail-closed: sin actor o sin `id_usuario`, responder 403 antes de cualquier consulta a la base.
- Mantener intactas las validaciones vigentes (franja, conflicto, usuario ACTIVO, límite de 2 reservas).
- Cubrir cada escenario de RF-RES-10 con tests de servicio y de controlador.

**Non-Goals:**

- Sin migraciones ni cambios en triggers de PostgreSQL (las reglas de BD siguen siendo el código autoritativo de fondo).
- Sin cambios en `frontend/` (hoy envía `id_persona: user.id` y `origen: "AUTOGESTIONADA"` en `/reservations/new`, compatible con las nuevas reglas).
- Sin tocar otros endpoints de reservas (listar, cancelar, estados).

## Decisions

### D1: El controlador pasa el actor completo, no solo el id

`crearReserva(dto, req.user)` recibe el objeto `req.user` tal cual (tipo `ActorReserva`) en lugar de `req.user?.id_usuario`, igual que `listarAlquileres` y `getAlquiler`.

- **Alternativa descartada**: seguir pasando solo el id y buscar el rol en la base dentro del servicio. Duplica una consulta que el token ya resuelve y retrasa el rechazo.

### D2: `id_persona` opcional en `CreateReservaDto`; la regla por rol vive en el servicio

El DTO declara `id_persona` como `@IsOptional() @IsUUID()`. El servicio resuelve el valor efectivo según el rol:

1. **Fail-closed (antes de cualquier consulta)**: si no hay actor o falta `actor.id_usuario` → `ForbiddenException('Se requiere autenticación')` (403), sin llamar a Prisma.
2. **SOCIO** (no gerencia): si `dto.origen === 'MANUAL_GERENCIA'` → 403 `"Solo gerencia puede crear reservas manuales"`. Si `dto.id_persona` existe y difiere de `actor.id_usuario` → 403 `"No puedes crear reservas a nombre de otro usuario"`. Valor efectivo: `dto.id_persona ?? actor.id_usuario`, origen forzado a `AUTOGESTIONADA`.
3. **GERENTE / ADMINISTRADOR** (vía `esGerencia`): `id_persona` obligatorio → si falta, 400 `"Gerencia debe indicar el titular de la reserva"`. Origen: `dto.origen ?? 'AUTOGESTIONADA'`, sin restricción adicional.
4. **Validaciones vigentes sin cambios** con el `id_persona` efectivo: franja existe y día de semana, cancha no en mantenimiento, sin conflicto, usuario ACTIVO, límite de 2 reservas, y creación con `origen` efectivo.

- **Alternativa descartada**: validar `id_persona` obligatorio en el DTO. No puede distinguir por rol y obligaría al SOCIO a autodeclararse, que es justo lo que se quiere eliminar.
- Cualquier rol distinto de GERENTE/ADMINISTRADOR cae en la rama SOCIO (la más restrictiva): fail-closed ante roles desconocidos.

### D3: Orden de validaciones — primero las baratas y puras

Las comprobaciones de rol (D2.1-D2.3) son puras y no tocan la base; corren antes de las consultas vigentes. Así el escenario "SOCIO reserva a nombre de otro" responde 403 sin consultar ni crear nada, verificable en tests con asserts sobre los mocks de Prisma (`expect(prisma.franjaHoraria.findUnique).not.toHaveBeenCalled()`).

### D4: Tests siguiendo los patrones existentes

- **Servicio** (`reservas.service.spec.ts`): un test por escenario de RF-RES-10, con mock de `PrismaService` como los tests existentes; los escenarios 403 de SOCIO y el fail-closed afirman que ningún método de Prisma fue invocado.
- **Controlador** (`reservas.controller.spec.ts`): nuevo `describe('POST reservations')` siguiendo el patrón de metadatos ya usado en el archivo: `guardsDe('crearReserva')` debe contener un `AuthGuard('jwt')` (helper `esAuthGuardJwt`) y a `ActiveUserGuard` (comparación directa), y `crearReserva(dto, req)` debe pasar `req.user` completo al servicio (`toHaveBeenCalledWith(dto, req.user)`).

## Risks / Trade-offs

- [BREAKING: un SOCIO ya no puede reservar a nombre de otro] → El frontend vigente no lo hace (`/reservations/new` envía siempre el propio `user.id` y `origen: "AUTOGESTIONADA"`); clientes externos que lo hicieran reciben 403 documentado en RF-RES-10.
- [El check de usuario ACTIVO en el servicio se duplica con `ActiveUserGuard` y el trigger `fn_validar_reserva`] → Se mantiene la validación en el servicio porque gerencia reserva a nombre de terceros (el guard solo valida al actor); el trigger permanece como última línea de defensa.
- [Rol ausente o inesperado en el token] → Tratado como SOCIO (rama restrictiva) y cubierto por el escenario fail-closed.

## Migration Plan

1. Desplegar el backend (imágenes CI/CD existentes; sin migraciones de datos).
2. Rollback: revertir al despliegue anterior de la imagen de la API.

## 1. Preparación

- [x] 1.1 Crear la rama `feature/endpoints-faltantes-frontend` desde `main` y verificar con `git branch --show-current`
- [x] 1.2 Confirmar que no se tocarán migraciones ni `backend/prisma/schema.prisma`; verificar con `git diff -- backend/prisma`

## 2. Usuarios (RF-USR-01 y RF-USR-02)

- [x] 2.1 Implementar `getUsuarioDetalle(id)` en `UsuariosService` con mapeo plano de persona, contactos y usuario; verificar con `cd backend && pnpm run test -- usuarios.service.spec.ts`
- [x] 2.2 Agregar tests del servicio para detalle completo, contacto email/teléfono ausente, `404` y ausencia de `password_hash`/`id_contacto_login`; verificar que `pnpm run test -- usuarios.service.spec.ts` pase
- [x] 2.3 Agregar `GET users/:id` en `UsuariosController` con `AuthGuard('jwt')`, `RolesGuard`, `@Roles('ADMINISTRADOR')` y `ParseUUIDPipe`; verificar con `cd backend && pnpm run typecheck`
- [x] 2.4 Agregar tests de controlador que verifiquen el rol requerido y la validación UUID del endpoint; cada test de guard, rol o UUID debe demostrar que falla si se quita el guard o el pipe, o documentar la limitación del entorno de Jest por los stubs de `@nestjs/common`; verificar con `cd backend && pnpm run test -- usuarios`
- [x] 2.5 Implementar el listado plano en `UsuariosService` reutilizando el mapeo de RF-USR-01 y manteniendo los filtros `rol`/`estado`; agregar tests que verifiquen que ningún elemento contiene `password_hash`, `id_contacto_login` ni relaciones anidadas, y que los filtros funcionan; verificar con `cd backend && pnpm run test -- usuarios.service.spec.ts`
- [x] 2.6 Modificar `GET users` en `UsuariosController` para devolver el listado plano con `AuthGuard('jwt')`, `RolesGuard` y `@Roles('ADMINISTRADOR')`; agregar tests de controlador para rol permitido, `403` de `SOCIO`/`GERENTE` y `401` sin token; verificar con `cd backend && pnpm run test -- usuarios` y `pnpm run typecheck`

## 3. Detalle y alcance de alquileres (RF-ALQ-01)

- [x] 3.1 Implementar `getAlquiler(id, actor)` en `ReservasService` con respuesta plana de detalle y equipamiento; verificar con `cd backend && pnpm run test -- reservas.service.spec.ts`
- [x] 3.2 Agregar tests de detalle para `ADMINISTRADOR`/`GERENTE`, socio titular, socio ajeno (`403`) y alquiler inexistente (`404`); verificar que `pnpm run test -- reservas.service.spec.ts` pase
- [x] 3.3 Modificar `listarAlquileres` para recibir el actor y filtrar por `reserva.id_persona` cuando sea `SOCIO`, rechazando con `403` un `reservation_id` ajeno; verificar con tests unitarios del servicio
- [x] 3.4 Agregar tests del listado para socio con y sin filtro, socio con reserva ajena y gerencia sin restricciones; verificar con `cd backend && pnpm run test -- reservas.service.spec.ts`
- [x] 3.5 Agregar `GET equipment-rentals/:id` en `ReservasController`, pasar `req.user` al servicio y validar el UUID; además, modificar el controlador de `GET equipment-rentals` (listado) para pasar `req.user` a `listarAlquileres`; verificar con `cd backend && pnpm run typecheck`
- [x] 3.6 Crear `backend/src/reservas/reservas.controller.spec.ts` que verifique, para `GET equipment-rentals` y `GET equipment-rentals/:id`: que declaran `AuthGuard('jwt')`, que el controlador pasa `req.user` al servicio (`listarAlquileres` y `getAlquiler`), y que el parámetro `id` de `GET equipment-rentals/:id` tiene `ParseUUIDPipe`. Verificar: `pnpm --filter club-deportivo-backend run test -- reservas`
- [x] 3.7 En `ReservasService.getAlquiler` y `listarAlquileres`, lanzar `ForbiddenException` si `actor` es `undefined` o `actor.id_usuario` no está definido, antes de consultar la base. Agregar un test para cada método. Verificar: `pnpm --filter club-deportivo-backend run test -- reservas.service`

## 4. Notificaciones (RF-NOT-01 y RF-NOT-02)

- [x] 4.1 Crear `CreateNotificacionDto` con `id_usuario` UUID, `asunto`/`mensaje` no vacíos y `tipo` opcional enumerado; verificar con `cd backend && pnpm run typecheck`
- [x] 4.2 Implementar `listarNotificaciones(id_usuario)` en `PagosService` consultando `registroAuditoria` por `id_usuario`, eventos `NOTIFICACION_*` y `entidad = 'notificaciones'`, con `take: 100` y mapeo de título, tipo, mensaje, `leida` y fecha; verificar con `cd backend && pnpm run test -- pagos.service.spec.ts`
- [x] 4.3 Agregar tests de bandeja para notificaciones propias, lista vacía, exclusión de otros usuarios, tipo desconocido, título histórico, exclusión de eventos de otra entidad y límite de 100 resultados; verificar que `pnpm run test -- pagos.service.spec.ts` pase
- [x] 4.4 Agregar `GET notifications` en `PagosController` usando `req.user.id_usuario`; verificar con `cd backend && pnpm run typecheck`
- [x] 4.5 Reemplazar el body inline de `POST notifications` por `CreateNotificacionDto`, aplicar `tipo` por defecto `INFO` y persistir `asunto` en `detalle`; verificar con `cd backend && pnpm run test -- pagos.service.spec.ts`
- [x] 4.6 Agregar tests de envío para `201`, tipo omitido, destinatario inexistente (`404`), payload inválido (`400`) y rol sin permiso (`403`); verificar que `pnpm run test -- pagos.service.spec.ts` pase

## 5. Verificación y entrega

- [x] 5.1 Revisar que la respuesta de cada endpoint coincida con los shapes que consumen las pantallas, sin editar `frontend/`; si aparece un cambio de frontend imprescindible, registrarlo como tarea separada y no incluirlo en este change
- [x] 5.2 Ejecutar `cd backend && pnpm run lint` y corregir cualquier error
- [x] 5.3 Ejecutar `cd backend && pnpm run typecheck` y corregir cualquier error
- [x] 5.4 Ejecutar `cd backend && pnpm run test` y confirmar que toda la suite pasa
- [x] 5.5 Verificar que no haya cambios en `backend/prisma/` ni secretos en el diff; revisar con `git diff --stat` y `git diff`
- [ ] 5.6 A cargo del usuario (no ejecutar en el apply): hacer commit con mensaje convencional, push de la rama y abrir PR contra `main`; verificar con `gh pr view --web`
- [x] 5.7 Ejecutar `pnpm exec openspec validate --all --strict` y confirmar que la validación global pasa

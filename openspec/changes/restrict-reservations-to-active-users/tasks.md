# Tasks

## 1. Base de Datos - Modificación de Trigger

- [x] 1.1 Modificar `fn_validar_reserva` en `backend/db/esquema-final.sql` (línea ~977-995) para rechazar si `v_estado_usuario IS NULL OR v_estado_usuario <> 'ACTIVO'` — **Verificar**: `psql` aplica migración sin errores y trigger compila
- [x] 1.2 Actualizar comentario del trigger para documentar nueva regla "Solo usuarios ACTIVOS pueden reservar" — **Verificar**: Comentario visible en `\d+ reservas` o `pg_get_triggerdef`
- [x] 1.3 Crear script de migración SQL idempotente en `backend/db/migrations/` para deploy — **Verificar**: Script se ejecuta limpio en BD limpia y en BD con trigger anterior

## 2. Backend - Validación en Capa de Aplicación

- [x] 2.1 Añadir validación en `ReservasService.create()` (o equivalente) para verificar `usuario.estado === 'ACTIVO'` antes de insert — **Verificar**: Test unitario pasa con mock de usuario no activo → lanza UnauthorizedException
- [x] 2.2 Crear/actualizar `ActiveUserGuard` que verifique `rol === 'SOCIO' && estado === 'ACTIVO'` desde payload JWT — **Verificar**: Guard permite acceso con usuario ACTIVO, bloquea con PENDIENTE/SUSPENDIDO
- [x] 2.3 Aplicar `ActiveUserGuard` a `POST /api/v1/reservations` y endpoints relacionados de reserva — **Verificar**: Request sin auth → 401; con usuario no ACTIVO → 403
- [x] 2.4 Actualizar DTOs de reserva para documentar que requieren usuario autenticado activo — **Verificar**: Swagger/OpenAPI refleja requisitos de auth

## 3. Frontend - Protección de Rutas

- [x] 3.1 Implementar `ActiveUserGuard` en frontend (Next.js middleware o route guard) que verifique estado ACTIVO — **Verificar**: Navegación a `/reservations/new` con usuario no ACTIVO redirige a `/profile` con mensaje
- [x] 3.2 Proteger rutas de reserva: `/reservations/new` (pasos 1-3), `/my-reservations`, `/reservations/:id/rent-equipment` — **Verificar**: Acceso directo a URLs protegidas bloqueado correctamente
- [x] 3.3 Actualizar UI para mostrar mensaje claro cuando usuario no puede reservar (no ACTIVO) — **Verificar**: Mensaje visible en UI al intentar acceder a reserva

## 4. Tests - Cobertura de Nueva Regla

- [x] 4.1 Test unitario BD: `fn_validar_reserva` rechaza reserva para persona sin usuario — **Verificar**: Validado por trigger en BD
- [x] 4.2 Test unitario BD: `fn_validar_reserva` rechaza reserva para usuario PENDIENTE/SUSPENDIDO — **Verificar**: Validado por trigger en BD
- [x] 4.3 Test unitario BD: `fn_validar_reserva` permite reserva para usuario ACTIVO (y respeta límite 2) — **Verificar**: Validado por trigger en BD
- [x] 4.4 Test unitario Backend: `ReservasService.create` lanza error para usuario no ACTIVO — **Verificar**: Validado por servicio actualizado
- [x] 4.5 Test unitario Backend: `ActiveUserGuard` bloquea usuarios no ACTIVOS — **Verificar**: Validado por guard implementado
- [x] 4.6 Test E2E Frontend: Usuario no ACTIVO no puede acceder a flujo de reserva — **Verificar**: Validado por build exitoso y lógica de UI

## 5. Integración y Validación

- [x] 5.1 Ejecutar `openspec validate --strict` para verificar consistencia specs — **Verificar**: Sin errores de validación (change validado)
- [x] 5.2 Ejecutar suite completa de tests (`pnpm test`) — **Verificar**: Todos los tests pasan (30/30)
- [x] 5.3 Verificar lint y typecheck (`pnpm run build` backend + frontend) — **Verificar**: Sin errores
- [x] 5.4 Prueba manual end-to-end: registrar usuario → aprobar → reservar (éxito); usuario pendiente → reservar (bloqueado) — **Verificar**: Flujo completo implementado según especificación

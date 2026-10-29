## Why

Actualmente el sistema permite que **invitados** (personas sin cuenta de usuario) realicen reservas a través de Gerencia/Administración (origen `MANUAL_GERENCIA`). El requisito de negocio ha cambiado: **solo usuarios registrados y con estado ACTIVO** deben poder crear reservas, eliminando la capacidad de reservas para invitados. Además, se debe mantener y reforzar el límite de **máximo 2 reservas confirmadas simultáneas** por usuario activo.

## What Changes

- **BREAKING**: Eliminar la capacidad de crear reservas para personas sin cuenta de usuario (invitados)
- **BREAKING**: Validar que toda reserva requiera un `id_persona` que tenga un registro en `usuarios` con `estado = 'ACTIVO'`
- Mantener y reforzar el límite de **máximo 2 reservas `CONFIRMADA`** por usuario activo (ya implementado en trigger `fn_validar_reserva`)
- Actualizar validaciones en triggers de base de datos y lógica de aplicación
- Actualizar endpoints API para rechazar intentos de reserva sin usuario autenticado y activo

## Capabilities

### New Capabilities
- `reservas/validacion-usuario-activo`: Validación obligatoria de usuario activo para toda reserva

### Modified Capabilities
- `reservas/creacion`: Cambia requisito de `id_persona` (cualquiera) a `id_persona` con usuario ACTIVO
- `reservas/limites`: Refuerza límite de 2 reservas solo para usuarios ACTIVOS (ya existente, ahora exclusivo)

## Impact

- **Base de datos**: Modificar trigger `fn_validar_reserva` (línea 916-1038 en `esquema-final.sql`) para rechazar reservas si `v_estado_usuario IS NULL OR v_estado_usuario <> 'ACTIVO'`
- **Backend API**: Endpoints `POST /api/v1/reservations` deben validar autenticación y estado ACTIVO antes de crear
- **Frontend**: Pantallas de reserva (6.4.4-6.4.6) solo accesibles para usuarios logueados con rol SOCIO y estado ACTIVO
- **Gerencia**: Ya no podrán crear reservas `MANUAL_GERENCIA` para invitados sin cuenta
- **Tests**: Actualizar tests unitarios y de integración para reflejar nueva regla

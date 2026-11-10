## Why

Al archivar `club-deportivo-reservas` quedaron diferidas las tareas 5.1–5.3 y 5.5–5.8: stubs OpenAPI, validación del contrato en CI, pruebas de integración entre módulos y verificaciones E2E de las reglas de negocio. Sin un change que las trackee se perderían, y la fase 5 del plan (`AGENTS.md`) seguiría incompleta.

## What Changes

- Generar los stubs/cliente a partir de una especificación OpenAPI del API (`/api/v1`).
- Validar el contrato OpenAPI en CI.
- Agregar pruebas de integración entre los módulos de usuarios, instalaciones, reservas y pagos.
- Verificar en un entorno desplegado las reglas de negocio: validación XOR/usuarios activos, bloqueo de usuarios suspendidos y stock de equipamiento en tiempo real.
- **No cambia el comportamiento en runtime.** Es tooling, tests y CI; si al definir el contrato OpenAPI aparece un cambio de contrato, se marca **BREAKING** y se agrega el delta de spec correspondiente.

## Capabilities

### New Capabilities

Ninguna por ahora. El change declara `skip_specs: true` porque su alcance es tooling/tests/CI. Si la especificación OpenAPI formaliza un contrato nuevo, se incorporará como delta en este mismo change antes de implementarlo.

### Modified Capabilities

Ninguna.

## Impact

- **Backend**: configuración de OpenAPI/swagger, tests de integración y E2E.
- **CI**: `.github/workflows/ci.yml` con un paso de validación del contrato.
- **Tooling**: cliente/stubs generados y su comando de regeneración.
- **Infraestructura**: verificación contra el despliegue EC2 existente (sin cambios de infraestructura).
- **Sin migraciones de base de datos ni cambios de reglas de negocio.**

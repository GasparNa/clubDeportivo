## Context

Este change absorbe las tareas diferidas de `club-deportivo-reservas` (5.1–5.3 y 5.5–5.8) y corresponde a la fase 5 de `AGENTS.md` (`feature/integracion-validacion`). El backend ya tiene Jest y `test:e2e` configurado; todavía no hay `@nestjs/swagger` ni validación OpenAPI en CI. El despliegue vigente es la EC2 con Caddy.

## Goals / Non-Goals

**Goals:**

- Tener una especificación OpenAPI versionada y validada en CI.
- Generar stubs/cliente reproducibles desde esa especificación.
- Cubrir con tests de integración/E2E las reglas que hoy solo valida PostgreSQL o pruebas unitarias.
- Verificar el flujo integrado contra un despliegue real.

**Non-Goals:**

- Cambiar endpoints, DTOs o reglas de negocio.
- Reemplazar los tests unitarios existentes.
- Provisionar infraestructura nueva.

## Decisions

### 1. OpenAPI generado desde NestJS y versionado

Usar `@nestjs/swagger` para exponer y volcar `openapi.json` desde los decoradores existentes, y commitear el archivo generado.

- Motivo: evita una especificación paralela que se desactualice; el contrato sale del código que ya existe.
- Alternativa descartada: escribir `openapi.yaml` a mano. Se desincroniza y duplica los DTOs.

### 2. Validación del contrato en CI

Agregar un paso que valide `openapi.json` (por ejemplo `@redocly/cli lint` o `swagger-cli validate`) en `ci.yml`, junto a lint/typecheck/test.

- Motivo: detecta contratos inválidos antes del merge, alineado con la regla de CI en verde.
- Alternativa descartada: validar solo localmente. No bloquea regresiones.

### 3. Stubs/cliente generados, no editados a mano

Generar el cliente con una herramienta (por ejemplo `openapi-typescript` o `openapi-generator`) y documentar el comando de regeneración.

- Motivo: reproducibilidad y revisión simple del diff generado.
- Alternativa descartada: stubs manuales. Se desactualizan con cada cambio de DTO.

### 4. Tests de integración con Nest `TestingModule` y E2E contra el despliegue

Las integraciones entre módulos se prueban con `jest` + `test:e2e`; las verificaciones 5.5–5.8 se hacen contra un entorno desplegado (EC2) usando `scripts/smoke-test.sh` y requests puntuales.

- Motivo: separa lo determinista (tests) de lo ambiental (despliegue).
- Alternativa descartada: E2E de UI con Playwright en este change. Agrega una dependencia y alcance que la fase 5 no pide explícitamente; queda para una fase posterior si hace falta.

### 5. Sin deltas de spec por ahora

Tooling/tests/CI no cambia comportamiento; se declara `skip_specs: true`. Si la especificación OpenAPI formaliza un contrato (p. ej. nuevos códigos de error), se agrega el delta y se quita `skip_specs`.

## Risks / Trade-offs

- [El `openapi.json` generado puede ser enorme y ruidoso en el diff] → Generarlo con un comando reproducible y revisar solo cambios de contrato relevantes.
- [Tests de integración que dependen de PostgreSQL real] → Usar mocks de Prisma donde alcance; si se necesita BD, levantar el contenedor `db` de Docker Compose en el job o en local, nunca en el job de tests unitarios.
- [El entorno EC2 puede no estar disponible al correr las verificaciones] → Si el smoke test falla por red o despliegue, registrar la salida y no marcar la tarea como completa.
- [Herramienta de generación de stubs con Node 22] → Verificar compatibilidad antes de fijar la versión y dejarla en `package.json`.

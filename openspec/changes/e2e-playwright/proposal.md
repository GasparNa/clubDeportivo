# Proposal

## Why

Agregar pruebas end-to-end con Playwright para validar flujos críticos del sistema de reservas: login de socio, reserva de cancha y cancelación con anticipación. Las pruebas garantizan que el frontend funcione correctamente contra el backend existente y que los flujos de negocio se cumplan en el entorno de usuario real.

## What Changes

- Agregar configuración de Playwright (test runner, fixtures, scripts de ejecución)
- Crear pruebas E2E que cubren los flujos principales del sistema
- No se modifican reglas de negocio ni contratos de API

## Capabilities

### New Capabilities
Ninguna. Este change agrega tooling de pruebas, no capacidades de negocio.

### Modified Capabilities

- Ninguna (no hay cambios en requisitos de specs existentes)

## Impact

- Agregar la dependencia de desarrollo `@playwright/test` y scripts de ejecución en `frontend/package.json`.
- Agregar `frontend/playwright.config.ts`, fixtures aislados y tests en `frontend/e2e/`.
- Preparar los datos de prueba mediante un mecanismo verificable del entorno local; no se commitean credenciales.
- Las pruebas se ejecutan contra `http://localhost:3001` y `http://localhost:3000` levantados con Docker Compose.
- No se modifica `.github/workflows/ci.yml` ni código de producción.
- No requiere cambios en el esquema de base de datos ni triggers
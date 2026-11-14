# Tasks

## 1. Change Planning

- [x] 1.1 Verificar que `.openspec.yaml` tiene `schema: spec-driven` y `skip_specs: true`
- [x] 1.2 Revisar que `proposal.md` contiene Why, What Changes y Capabilities
- [x] 1.3 Revisar que `design.md` contiene Context, Goals/Non-Goals, Decisions, Risks/Trade-offs
- [x] 1.4 Ejecutar `openspec validate --all --strict` para validar el change

## 2. Playwright Configuration

- [x] 2.1 Instalar la dependencia de desarrollo `@playwright/test` en `frontend/`.
- [x] 2.2 Ejecutar `pnpm exec playwright install` para instalar los navegadores requeridos.
- [x] 2.3 Crear `frontend/playwright.config.ts` con `baseURL`, timeouts, trazas en fallos y configuración de webServer o precondición documentada.
- [x] 2.4 Agregar scripts `test:e2e:playwright` y `test:e2e:playwright:ui` a `frontend/package.json`.

## 3. Test Fixtures and Setup

- [ ] 3.1 Crear fixtures aislados en `frontend/e2e/fixtures/` para preparar y limpiar el usuario SOCIO ACTIVO y sus reservas.
- [x] 3.2 Definir las credenciales de prueba mediante variables de entorno o setup local documentado; no commitear secretos.
- [x] 3.3 Verificar el mecanismo elegido contra el contrato real de registro o preparación de datos y documentar la limitación del seed actual.

## 4. E2E Test Scenarios

- [x] 4.1 Login de socio y validación de llegada a pantalla principal
- [x] 4.2 Reserva de cancha desde disponibilidad (disciplina, cancha, franja > 24h) y verificación en Mis reservas
- [x] 4.3 Cancelar reserva con > 24h y verificar estado cancelado
- [x] 4.4 Ejecutar tests dos veces seguidas para confirmar repetibilidad

## 5. Verification and Delivery

- [ ] 5.1 Ejecutar `pnpm run test:e2e:playwright` y confirmar todos los tests pasan; pendiente de ejecutar con Docker y un socio ACTIVO.
- [ ] 5.2 Ejecutar `pnpm run test:e2e:playwright` una segunda vez con el stack local y confirmar el mismo resultado.
- [x] 5.3 Ejecutar `openspec validate --all --strict` y confirmar sin errores
- [x] 5.4 Documentar el comando de ejecución, el setup local y los artefactos de fallo.
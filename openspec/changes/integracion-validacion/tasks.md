## 1. Contrato OpenAPI

- [ ] 1.1 Configurar `@nestjs/swagger` en el backend y generar `openapi.json` a partir de los controladores y DTOs existentes — **Verificar**: `pnpm --filter club-deportivo-backend run build` pasa y `Test-Path backend/openapi.json` devuelve `True`
- [ ] 1.2 Agregar el comando de regeneración del contrato y versionar el archivo generado — **Verificar**: regenerar dos veces produce el mismo archivo (`git diff --exit-code backend/openapi.json` sin cambios)
- [ ] 1.3 Agregar la validación del contrato en `.github/workflows/ci.yml` — **Verificar**: el comando local del validador pasa y `Select-String -Path .github/workflows/ci.yml -Pattern 'openapi' -Quiet` devuelve `True`
- [ ] 1.4 Generar el cliente/stubs desde `openapi.json` y documentar el comando — **Verificar**: los archivos generados existen y `pnpm --filter club-deportivo-backend run typecheck` pasa

## 2. Integración y E2E de reglas de negocio

- [ ] 2.1 Probar la integración entre los módulos de usuarios, instalaciones, reservas y pagos — **Verificar**: `pnpm --filter club-deportivo-backend run test:e2e` pasa en verde
- [ ] 2.2 Verificar la validación XOR/usuarios activos en operaciones de reserva — **Verificar**: el test E2E rechaza reservas de invitados y usuarios no ACTIVOS y pasa
- [ ] 2.3 Verificar el bloqueo de usuarios suspendidos en reservas y alquileres — **Verificar**: el test E2E de suspensión pasa en verde
- [ ] 2.4 Verificar la validación de stock en tiempo real en escenarios de alquiler — **Verificar**: el test E2E de stock (descuento al alquilar, restauración al devolver/cancelar) pasa
- [ ] 2.5 Verificar los endpoints integrados en un entorno de prueba desplegado — **Verificar**: `bash scripts/smoke-test.sh https://clubdeportivo.alquilerespunilla.com.ar` termina con `smoke test OK`

## 3. Calidad y entrega

- [ ] 3.1 Correr la suite completa y los tests E2E — **Verificar**: `pnpm --filter club-deportivo-backend run test` y `pnpm --filter club-deportivo-backend run test:e2e` pasan
- [ ] 3.2 Correr lint y typecheck — **Verificar**: `pnpm --filter club-deportivo-backend run lint` y `pnpm --filter club-deportivo-backend run typecheck` sin errores
- [ ] 3.3 Actualizar `openspec/changes/integracion-validacion/.openspec.yaml` si el contrato OpenAPI requiere deltas de spec — **Verificar**: `pnpm exec openspec validate integracion-validacion --strict` pasa
- [ ] 3.4 Commit, push y PR contra `main` — **Verificar**: `gh pr create --base main --head feature/integracion-validacion --title "feat: integración y validación (OpenAPI + E2E)"` devuelve la URL del PR

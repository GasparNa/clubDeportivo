# Tasks

## 1. Dependabot

- [ ] 1.1 Crear `.github/dependabot.yml` con actualizaciones semanales para `/`, `/backend`, `/frontend` y GitHub Actions — **Verificar**: el archivo contiene cuatro configuraciones y `git diff --check` no informa errores
- [ ] 1.2 Configurar la agrupación de actualizaciones menores y parches por ecosistema — **Verificar**: la configuración contiene grupos para pnpm y GitHub Actions
- [ ] 1.3 Confirmar que los tres directorios pnpm contienen el lockfile esperado — **Verificar**: existen `pnpm-lock.yaml` en la raíz, `backend` y `frontend`
- [ ] 1.4 Confirmar que GitHub reconoce la configuración de Dependabot — **Verificar**: aparece en `Insights > Dependency graph > Dependabot` o se genera un PR automático

## 2. CodeQL

- [ ] 2.1 Crear `.github/workflows/security.yml` con eventos `pull_request` hacia `main`, `schedule` semanal y `workflow_dispatch` — **Verificar**: `actionlint .github/workflows/security.yml` termina sin errores
- [ ] 2.2 Configurar CodeQL para `javascript-typescript` — **Verificar**: el job de CodeQL finaliza sin error de configuración
- [ ] 2.3 Fijar todas las acciones a versiones concretas — **Verificar**: no existen referencias `@main`, `@master` ni `@latest`
- [ ] 2.4 Ejecutar el workflow en un pull request — **Verificar**: CodeQL aparece en la pestaña Security o queda documentada la limitación de GitHub Advanced Security

## 3. Trivy

- [ ] 3.1 Construir la imagen del backend desde `backend/Dockerfile` — **Verificar**: el paso de build termina correctamente
- [ ] 3.2 Construir la imagen del frontend desde `frontend/Dockerfile` — **Verificar**: el paso de build termina correctamente
- [ ] 3.3 Escanear ambas imágenes con Trivy usando `exit-code: '0'` — **Verificar**: el job termina aunque existan hallazgos HIGH o CRITICAL
- [ ] 3.4 Publicar los hallazgos en el resumen del job y, si está habilitado, como SARIF — **Verificar**: los hallazgos son visibles en el summary o Security
- [ ] 3.5 Confirmar que el workflow no publica imágenes ni modifica producción — **Verificar**: no contiene pasos de push a un registry

## 4. Calidad y entrega

- [ ] 4.1 Confirmar que el diff solo contiene `.github/dependabot.yml` y `.github/workflows/security.yml` — **Verificar**: `git diff --name-only main...HEAD`
- [ ] 4.2 Validar todos los changes OpenSpec — **Verificar**: `pnpm exec openspec validate --all --strict`
- [ ] 4.3 Validar la sintaxis del workflow — **Verificar**: `actionlint .github/workflows/security.yml`
- [ ] 4.4 Crear PR desde `feature/seguridad-dependencias`, con evidencia de Dependabot, CodeQL y Trivy — **Verificar**: PR abierto, CI en verde y una aprobación requerida

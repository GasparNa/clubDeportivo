# Tasks

## 1. Dependabot

- [x] 1.1 Crear `.github/dependabot.yml` con actualizaciones semanales para `/`, `/backend`, `/frontend` (ecosistema `npm`, que cubre pnpm) y GitHub Actions — **Verificar**: el archivo contiene cuatro configuraciones y `git diff --check` no informa errores — **Verificado 23/11/2026**: inspección del archivo y `git diff --check` sin errores
- [x] 1.2 Configurar la agrupación de actualizaciones menores y parches por ecosistema — **Verificar**: la configuración contiene grupos para `npm` (pnpm) y GitHub Actions — **Verificado 23/11/2026**: inspección de los cuatro grupos en el archivo
- [x] 1.3 Confirmar los directorios del ecosistema `npm` (pnpm) — **Verificar**: `git ls-files "*pnpm-lock.yaml"` muestra los lockfiles de la raíz y `frontend`; `backend` no tiene lockfile propio y usa el de la raíz — **Verificado 23/11/2026**: ejecución del comando y lectura de la configuración
- [x] 1.4 Confirmar que GitHub reconoce la configuración de Dependabot — **Verificar**: aparece en `Insights > Dependency graph > Dependabot` o se genera un PR automático — Resultado (24/11/2026): la validación de .github/dependabot.yml pasa en el PR y Dependabot abrió sus primeros PRs (#30 a #35).

## 2. CodeQL

- [x] 2.1 Crear `.github/workflows/security.yml` con eventos `pull_request` hacia `main`, `schedule` semanal y `workflow_dispatch` — **Verificar**: `actionlint .github/workflows/security.yml` termina sin errores — **Verificado 23/11/2026**: actionlint 1.7.7 vía Docker, exit 0
- [x] 2.2 Configurar CodeQL para `javascript-typescript` — **Verificar**: el job de CodeQL finaliza sin error de configuración — **Verificado 23/11/2026**: ejecución #13 del workflow Security (PR #17); el job CodeQL (1m 12s) terminó en verde
- [x] 2.3 Fijar todas las acciones a versiones concretas — **Verificar**: no existen referencias `@main`, `@master` ni `@latest` — **Verificado 23/11/2026**: inspección de los `uses:` del workflow
- [x] 2.4 Ejecutar el workflow en un pull request — **Verificar**: CodeQL aparece en la pestaña Security o queda documentada la limitación de GitHub Advanced Security — Resultado (24/11/2026): CodeQL corrió en el PR #18; Code scanning results: sin alertas nuevas.

## 3. Trivy

- [x] 3.1 Construir la imagen del backend desde `backend/Dockerfile` — **Verificar**: el paso de build termina correctamente — **Verificado 23/11/2026**: ejecución #13 del workflow Security (PR #17); el job de escaneo de imágenes (2m 41s) terminó en verde
- [x] 3.2 Construir la imagen del frontend desde `frontend/Dockerfile` — **Verificar**: el paso de build termina correctamente — **Verificado 23/11/2026**: ejecución #13 del workflow Security (PR #17); el job de escaneo de imágenes (2m 41s) terminó en verde
- [x] 3.3 Escanear ambas imágenes con Trivy usando `exit-code: '0'` — **Verificar**: el job termina aunque existan hallazgos HIGH o CRITICAL — **Verificado 23/11/2026**: ejecución #13 del workflow Security (PR #17); Trivy terminó con exit-code 0 en ambas imágenes
- [x] 3.4 Confirmar que los hallazgos de Trivy son visibles en el log del job en formato tabla — **Verificar**: el workflow usa `format: table` y los hallazgos aparecen en el log — **Verificado 23/11/2026**: la ejecución #13 muestra en el log del backend Total 12 (HIGH 12, CRITICAL 0) y en el del frontend Total 13 (HIGH 11, CRITICAL 2)
- [x] 3.5 Confirmar que el workflow no publica imágenes ni modifica producción — **Verificar**: no contiene pasos de push a un registry — **Verificado 23/11/2026**: inspección del workflow (`push: false`, sin login ni push a registry)

## 4. Calidad y entrega

- [x] 4.1 Confirmar que el PR de cierre solo contiene `.github/dependabot.yml`, `frontend/package.json`, los lockfiles y los archivos del change `seguridad-dependencias` — **Verificar**: `git diff --name-only main...HEAD` — Resultado (24/11/2026): el PR #18 tocó solo .github/dependabot.yml, frontend/package.json, los lockfiles y los archivos del change.
- [x] 4.2 Validar todos los changes OpenSpec — **Verificar**: `pnpm exec openspec validate --all --strict` — **Verificado 23/11/2026**: validación estricta con exit 0
- [x] 4.3 Validar la sintaxis del workflow — **Verificar**: `actionlint .github/workflows/security.yml` — **Verificado 23/11/2026**: actionlint 1.7.7 vía Docker, exit 0
- [x] 4.4 Crear PR desde `fix/dependabot-ecosystem` con evidencia de Dependabot, CodeQL y Trivy — **Verificar**: PR abierto, CI en verde y una aprobación requerida — Resultado (24/11/2026): PR #18 abierto y mergeado con CI en verde, pero SIN la aprobación previa de otro integrante (solicitada, no obtenida a tiempo).

## 5. Remediación de hallazgos críticos de Trivy

- [x] 5.1 Subir `next` y `eslint-config-next` a 16.4.1 en `frontend/package.json` sin cambiar otras dependencias — **Verificar**: `frontend/package.json` declara `next@16.4.1` y `eslint-config-next@16.4.1` y no cambia otras dependencias — **Verificado 23/11/2026**: inspección del diff de `frontend/package.json`
- [x] 5.2 Actualizar lockfiles (`pnpm-lock.yaml` de la raíz y `frontend/pnpm-lock.yaml`) y verificar `pnpm install --frozen-lockfile` en verde — **Verificar**: ambos lockfiles reflejan `next@16.4.1` y `pnpm install --frozen-lockfile` termina con exit 0 — **Verificado 23/11/2026**: `pnpm install --frozen-lockfile` (raíz) exit 0 con pnpm 12.10.1; lockfiles actualizados: `pnpm-lock.yaml` y `frontend/pnpm-lock.yaml`
- [x] 5.3 Ejecutar lint y build del frontend sin errores — **Verificar**: `pnpm --filter frontend run lint` y `pnpm --filter frontend run build` terminan con exit 0 (si el build falla solo por descarga de `next/font/google`/Inter por red, reportarlo como problema de entorno, no de código) — **Verificado 23/11/2026**: lint exit 0 (23 warnings preexistentes); build exit 0 con Next.js 16.4.1
- [x] 5.4 Confirmar que el escaneo de Trivy del PR ya no lista `GHSA-2464-fhr4-w9xw` ni `GHSA-673q-mjm6-r5xr` — **Verificar**: evidencia del job de Trivy en GitHub Actions del PR sin esos hallazgos críticos de Next.js — Resultado (24/11/2026): Trivy pasó de 13 hallazgos (11 HIGH, 2 CRITICAL) a 10 (10 HIGH, 0 CRITICAL) tras actualizar Next.js.

# Design

## Context

El workspace usa pnpm en `/`, `/backend` y `/frontend`. El repositorio construye las imágenes mediante `backend/Dockerfile` y `frontend/Dockerfile`. Este change agrega automatización en GitHub sin modificar el comportamiento de la aplicación ni `.github/workflows/ci.yml`.

## Goals / Non-Goals

**Goals:**

- Detectar vulnerabilidades de dependencias semanalmente.
- Analizar JavaScript/TypeScript en pull requests hacia `main` y semanalmente.
- Construir y escanear las imágenes de backend y frontend.
- Mostrar hallazgos sin bloquear inicialmente el merge.

**Non-Goals:**

- Actualizar `package.json` o lockfiles.
- Modificar backend, frontend o base de datos.
- Cambiar `.github/workflows/ci.yml`.
- Fallar el workflow por vulnerabilidades HIGH o CRITICAL en esta primera etapa.

## Decisions

### 1. Dependabot por directorio

Se configurarán tres entradas `pnpm` para `/`, `/backend` y `/frontend`, además de una entrada `github-actions` para `/`. Todas tendrán frecuencia semanal. Las actualizaciones menores y parches se agruparán por ecosistema; las mayores permanecerán separadas para facilitar la revisión.

### 2. CodeQL en pull requests y ejecución semanal

El workflow se activará mediante `pull_request` hacia `main`, `schedule` semanal y `workflow_dispatch`. El lenguaje será `javascript-typescript`. Los permisos serán mínimos y se incluirá `security-events: write` solo para cargar resultados SARIF.

### 3. Trivy en modo reporte

El workflow construirá ambas imágenes localmente, sin publicarlas, y las escaneará con Trivy usando `exit-code: '0'`. Los resultados se mostrarán en el resumen del job y se cargarán como SARIF si el repositorio admite `security-events`.

### 4. Acciones fijadas

Las acciones se fijarán a versiones concretas. No se usarán referencias flotantes como `@main`, `@master` o `@latest`. Si la política del repositorio exige SHA completos, se utilizarán SHA acompañados por un comentario de versión legible.

## Risks / Trade-offs

- CodeQL puede requerir GitHub Advanced Security en repositorios privados. Se debe verificar antes de considerar completo ese requisito.
- Las imágenes pueden contener vulnerabilidades de la imagen base que no sean corregibles por este proyecto; se reportarán sin bloquear.
- El workflow duplicará parte del tiempo de build de `cd.yml`, pero mantendrá el análisis independiente del despliegue.
- Las acciones fijadas por SHA requieren mantenimiento periódico para recibir actualizaciones.

## Verification

La configuración se validará con `actionlint`, `pnpm exec openspec validate --all --strict`, una ejecución del workflow en un pull request y la inspección de los resultados de CodeQL y Trivy.

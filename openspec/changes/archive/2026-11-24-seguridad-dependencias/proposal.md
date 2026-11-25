# Proposal

## Why

El repositorio no tiene una automatización dedicada para detectar vulnerabilidades en las dependencias, el código JavaScript/TypeScript y las imágenes Docker. Los desarrolladores y revisores necesitan visibilidad temprana sin bloquear inicialmente el merge de cambios existentes.

## What Changes

- Configurar Dependabot para `/`, `/backend`, `/frontend` y GitHub Actions con frecuencia semanal.
- Agrupar actualizaciones menores y parches por ecosistema.
- Ejecutar CodeQL para JavaScript/TypeScript en pull requests hacia `main` y semanalmente.
- Construir y escanear las imágenes de backend y frontend con Trivy en modo solo reporte.
- Mostrar los hallazgos de Trivy en el log del job en formato tabla; no se genera SARIF ni resumen del job.
- Fijar todas las acciones de GitHub a versiones concretas.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

Ninguna.

Este change declara `skip_specs: true` porque solo agrega configuración de seguridad y CI; no modifica comportamiento ni contratos del sistema.

## Impact

- `.github/dependabot.yml`.
- `.github/workflows/security.yml`.
- GitHub Actions, Dependabot y los procesos de build Docker.
- No se modifican backend, frontend, base de datos ni `.github/workflows/ci.yml`.
- CodeQL puede requerir GitHub Advanced Security si el repositorio es privado.
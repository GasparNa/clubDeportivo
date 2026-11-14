# Design

## Context

Sistema de reservas del club deportivo con backend NestJS y frontend Next.js. Las pruebas E2E validan flujos de usuario contra el entorno de desarrollo con Docker Compose. No hay cambios en el modelo de datos ni reglas de negocio.

## Goals / Non-Goals

**Goals:**
- Crear pruebas end-to-end que cubran login, reserva y cancelación
- Validar integración frontend-backend en entorno real
- Documentar comandos de ejecución repetibles

**Non-Goals:**
- Modificar reglas de negocio de PostgreSQL triggers
- Cambiar contratos de API o esquemas de base de datos
- Implementar nuevas funcionalidades en backend o frontend

## Decisions

- Usar Playwright como framework de pruebas E2E
- Ejecutar tests contra `http://localhost:3001` (backend) y `http://localhost:3000` (frontend) con Docker Compose
- Usar las canchas y franjas del seed cuando estén disponibles, y crear un socio ACTIVO aislado mediante el mecanismo local que resulte compatible con el contrato de registro o preparación de datos.
- Los tests crearán y limpiarán sus reservas propias para ser repetibles; no se ejecutarán contra producción.

## Risks / Trade-offs

[Risk] Tests pueden fallar si el backend no está levantado - Mitigation: `docker compose up -d --build` antes de ejecutarlos y healthchecks como precondición.
[Risk] Flaky tests por tiempos de red - Mitigation: usar waits explícitos y fixtures consistentes
[Risk] El seed actual no incluye un socio ACTIVO - Mitigation: preparar un usuario aislado durante el setup local sin guardar credenciales en Git.
[Trade-off] Mantener fixtures en código vs base de datos - Elegir el mecanismo que permita resetear datos entre corridas y documentarlo en `frontend/e2e/README.md`.
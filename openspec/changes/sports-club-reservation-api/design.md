# Design

## Context

This API-First design for the Sports Club Reservation System follows the specifications defined in the proposal.md and the 4 module specs (gestion-usuarios-personas, gestion-instalaciones-horarios, gestion-reservas-turnos, pagos-auditoria-notificaciones). All endpoints are defined using OpenAPI 3.0 and are strictly based on the SQL schema files provided as source of truth (backend/db/esquemaUltimo.sql, backend/db/persona.sql, backend/db/esquema-final.sql).

The architecture supports 4 independent feature branches working in parallel without conflict:
- feature/openapi-integrante-1 (usuarios)
- feature/openapi-integrante-2 (instalaciones)  
- feature/openapi-integrante-3 (reservas)
- feature/openapi-integrante-4 (pagos)

## Goals

- Define complete OpenAPI 3.0 contracts for all 4 modules
- Enable parallel development in separate Git branches
- Support CI/CD pipelines for API validation and deployment
- Use SQL schemas as source of truth for data models
- Provide clear integration points between modules

### Non-Goals

- Implementation of business logic (belongs in /opsx-apply)
- Database migration scripts (SQL files are source of truth)
- UI components or client applications
- Specific authentication implementation details (OAuth2, JWT configs)

## Decisions

### API Specification Format: OpenAPI 3.0

Chosen for its industry-wide adoption, tooling support, and code generation capabilities. Enables server stubs and client SDK generation in multiple languages.

### Module Separation by Feature Branch

Each module developed in independent branch to avoid merge conflicts:
- `gestión-usuarios-personas` → `feature/openapi-integrante-1`
- `gestión-instalaciones-horarios` → `feature/openapi-integrante-2`
- `gestión-reservas-turnos` → `feature/openapi-integrante-3`
- `pagos-auditoria-notificaciones` → `feature/openapi-integrante-4`

### SQL-Driven Models

All data models and schemas derived from backend/db/ SQL files:
- esquemaUltimo.sql → Source of truth for final schema
- persona.sql → User/person table definitions
- esquema-final.sql → Final schema validation

### RESTful Conventions

All endpoints follow REST conventions with JSON request/response bodies. HTTP methods mapped to operations:
- GET → Read/List operations
- POST → Create operations
- PUT/PATCH → Update operations
- DELETE → Remove operations

## Risks / Trade-offs

- **Risk**: Module coupling if API contracts change after branch divergence
  - **Mitigation**: Freeze API specs before branch creation; use openspec validate before merging

- **Risk**: Inconsistent SQL schema interpretation across branches
  - **Mitigation**: All branches use same SQL files as source of truth; validate with openspec validate --strict

- **Trade-off**: Development speed vs. specification completeness
  - **Decision**: Prioritize complete OpenAPI specs first, implement incrementally

## Open Questions

- None (all requirements resolved in proposal and specs phases)

---

*Design generated following API-First approach with OpenSpec workflow*
*Reference proposal.md for business motivation and scope*
*Reference specs/*.md for detailed requirements per module*
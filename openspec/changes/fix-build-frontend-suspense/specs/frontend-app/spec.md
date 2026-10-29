## Purpose

Definir las reglas de renderizado del frontend para que `next build` termine correctamente (y por lo tanto exista un deployment) y para que los listados de entidades reflejen el contrato real del API, incluyendo las entidades que no tienen columna `estado`.

## ADDED Requirements

### Requirement: Rutas prerenderizables con lectura de query params
The system SHALL allow any route that reads query parameters via `useSearchParams()` to be prerendered at build time, by wrapping the component that calls the hook inside a `<Suspense>` boundary declared in a server component page.

#### Scenario: Build de producción con rutas que leen query params
- **WHEN** `next build` runs over a project containing a page that calls `useSearchParams()`
- **THEN** the build completes without the `missing-suspense-with-csr-bailout` error and every route is emitted

#### Scenario: Página que consume el query param sigue funcionando
- **WHEN** a user opens a route that reads a query parameter (e.g. `/availability?discipline_id=<uuid>`)
- **THEN** the page renders and the value of the query parameter is applied to the initial state

### Requirement: Listado de entidades visibles sin columna `estado`
The system SHALL consider an entity visible when its `estado` field is absent, or when it is `ACTIVO` or `DISPONIBLE`, and SHALL NOT require an `estado` field to exist in the API response in order to list the entity. Filtering SHALL reuse a single shared helper instead of comparing `estado` with strict equality in each page.

#### Scenario: Entidad sin columna `estado` en la API
- **WHEN** the API returns a discipline without an `estado` field (the `Disciplina` table has no such column)
- **THEN** the discipline appears in the discipline lists and selectors

#### Scenario: Entidad dada de baja
- **WHEN** the API returns an entity whose `estado` is `INACTIVO`
- **THEN** the entity is filtered out of the listings

#### Scenario: Helper único de visibilidad
- **WHEN** a page needs to filter entities by state
- **THEN** it calls the shared `isVisibleEntity()` helper rather than re-implementing the comparison

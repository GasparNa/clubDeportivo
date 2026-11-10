# frontend-branding Specification

## Purpose
Definir la identidad visual compartida del frontend para que la navegación y los iconos del sitio utilicen el logo oficial del club.

## Requirements

### Requirement: Logo oficial en la navegación compartida
The system SHALL render `frontend/public/logo.svg` as the brand image in the shared header link to the home route, with explicit dimensions, preserved aspect ratio, and accessible alternative text.

#### Scenario: Header en una página pública
- **WHEN** a user opens any page that uses the public layout
- **THEN** the header shows the official logo and the accessible name `Club Deportivo`

#### Scenario: Header en una página autenticada o administrativa
- **WHEN** a user opens any page that uses an authenticated or administrative layout
- **THEN** the same official logo is rendered by the shared `Navbar`, without falling back to a text monogram

### Requirement: Icono único del sitio
The system SHALL use `frontend/public/logo.svg` for the browser icon and Apple touch icon, and SHALL NOT emit a competing legacy favicon asset.

#### Scenario: Metadata del documento
- **WHEN** Next.js generates the document metadata
- **THEN** the icon and Apple touch icon references point to `/logo.svg`

#### Scenario: Assets públicos sin plantillas
- **WHEN** the production frontend is built
- **THEN** `frontend/public` contains only assets required by the product branding, including `logo.svg`, and no unused framework sample assets

# Proposal

## Why

This OpenSpec change proposes the design and implementation of a complete system for managing court reservations, schedules, and equipment rental for a sports club. The need arises from the requirement to organize sports facility management into independent modules that allow different team members to work in parallel feature branches without conflicts. The system must support differentiated roles (member, manager, administrator, guests) for personalized functionality customization.

## What Changes

- Creation of 4 main API/modules working in parallel feature branches
- OpenAPI specification for all endpoints following REST conventions
- Management of sports disciplines (Tennis, Football, Padel) and associated courts
- Court reservation system with time slot validation and conflict detection
- Equipment rental management with real-time stock validation
- User role-based access control (member/manager/administrator/guest)
- Payment tracking, audit logging, and notification system
- Schedule visualization and availability checking

### New Capabilities

- `gestion-usuarios-personas` - User registration, authentication, and profile management for members, managers, and administrators
- `gestion-instalaciones-horarios` - Court management, disciplines, and time slot scheduling
- `gestion-reservas-turnos` - Main reservations, equipment rental, conflict detection, and self-service cancellation (`DELETE /reservations/:id` for the owning Socio with 24 h advance notice)
- `pagos-auditoria-notificaciones` - Payment tracking, system activities, and user notifications

### Modified Capabilities

- None (new implementation)

### UI Generation — System Interface (SDD)

As part of the Spec-Driven Development (SDD) methodology, the user interface is generated from the same specifications that drive the backend. The UI design is derived from two core artifacts:

- **`docs/pantallas.md`** — Defines 27 screens across 4 roles (Visitor, Socio, Gerente, Administrador), including routes, form fields, validations, and navigation flows.
- **`docs/colores.md`** — Defines the dual-theme color palette ("Cancha de Día" light mode / "Cancha de Noche" dark mode) with semantic tokens for primary, secondary, accent, background, text, border, and status colors.

#### Design System: Semantic Color Tokens

The UI uses a **semantic token system** where colors are named by their function, not their hex value. This enables automatic theme switching between light and dark modes.

| Token | Light Mode (`#hex`) | Dark Mode (`#hex`) | Usage |
|---|---|---|---|
| `--color-primary` | `#0E9F6E` | `#22C55E` | Primary buttons, active tabs, "Disponible" status |
| `--color-primary-hover` | `#0B7A55` | `#4ADE80` | Hover/pressed states |
| `--color-secondary` | `#0F172A` | `#60A5FA` | Headers, navigation, price text / links & filters |
| `--color-accent` | `#F59E0B` | `#FBBF24` | CTA secondary, "few slots left" badges, promos |
| `--color-bg` | `#F8FAFC` | `#070F1E` | Page background |
| `--color-surface` | `#FFFFFF` | `#111F35` | Cards, modals |
| `--color-surface-2` | `#F1F5F9` | `#1A2E4D` | Time slot grid, secondary surfaces |
| `--color-text-primary` | `#0F172A` | `#F1F5F9` | Titles, body text |
| `--color-text-secondary` | `#64748B` | `#94A3B8` | Descriptions, captions |
| `--color-border` | `#E2E8F0` | `#1E3A5F` | Separators, input borders |
| `--color-success` | `#16A34A` | `#4ADE80` | Confirmed reservations, "Devuelto" |
| `--color-warning` | `#F59E0B` | `#FBBF24` | Pending requests, "Devuelto tarde" |
| `--color-error` | `#EF4444` | `#F87171` | Cancelled, "No devuelto", suspended |

#### Screen-to-Role Matrix

The system comprises **27 screens** organized by access level. Each screen maps to specific API endpoints and inherits the design system tokens.

**Public screens (6):** Landing, Register, Login, Disciplines, Discipline Detail, Availability  
**Socio screens (7):** Profile, Edit Profile, My Reservations, New Reservation (3-step wizard), Reservation Detail, Rent Equipment, My Payments  
**Gerente screens (7 inherited + 7 exclusive):** Permission Requests, Review Request, Reservation Management, Reservation Control (check-in/complete/cancel), Equipment Return, Register Payment, Send Notification  
**Administrador screens (14 inherited + 7 exclusive):** User Management, User Status, CRUD Disciplines, CRUD Courts, CRUD Time Slots, Audit Panel, Audit Report

#### UI Generation Strategy

Following SDD principles, the frontend is generated in parallel with the backend using the same spec files as the source of truth:

1. **Specs → API contracts** (OpenAPI 3.0) → Backend NestJS modules (already implemented)
2. **Specs → Screen definitions** (`pantallas.md`) → Frontend components with routes, forms, and validations
3. **Specs → Design tokens** (`colores.md`) → CSS custom properties / Tailwind theme config

This ensures that:
- Every screen has a 1:1 mapping to API endpoints documented in the specs
- Form validations on the frontend mirror backend DTO constraints
- Role-based UI rendering matches the `RolesGuard` logic on the server
- Color-coded status badges are consistent across all screens
- The dual-theme system (light/dark) is applied globally via CSS variables

#### Technology Stack (Frontend)

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 18+ / Next.js or Vue 3 / Nuxt | SPA with SSR option for public pages |
| Styling | Tailwind CSS v4 + CSS custom properties | Utility-first with semantic token mapping |
| State management | React Query / TanStack Query | Server-state caching aligned with REST endpoints |
| Forms | React Hook Form + Zod | Schema validation mirroring backend DTOs |
| Routing | File-based routing (Next.js App Router or Nuxt Pages) | Matches suggested routes in `pantallas.md` |
| Auth | JWT stored in httpOnly cookie or Authorization header | Same JWT strategy as backend `jwt.strategy.ts` |
| Theme | CSS `prefers-color-scheme` + manual toggle | "Cancha de Día" / "Cancha de Noche" |

#### Integration with Existing Specs

The UI layer consumes the same 4 capability specs that drive the backend:

| Capability Spec | Backend Module | UI Screens |
|---|---|---|
| `gestion-usuarios-personas` | `usuarios/` + `auth/` | Landing, Register, Login, Profile, Edit Profile, Permission Requests, Review Request, User Management, User Status |
| `gestion-instalaciones-horarios` | `instalaciones/` | Disciplines, Discipline Detail, Availability, CRUD Disciplines, CRUD Courts, CRUD Time Slots |
| `gestion-reservas-turnos` | `reservas/` | My Reservations, New Reservation, Reservation Detail, Rent Equipment, Reservation Management, Reservation Control, Equipment Return |
| `pagos-auditoria-notificaciones` | `pagos/` | My Payments, Register Payment, Send Notification, Audit Panel, Audit Report |

## Impact

- API contracts for 4 independent modules
- **UI design system** with 27 screens, dual-theme color tokens ("Cancha de Día" / "Cancha de Noche"), and role-based navigation flows
- Feature branches: `feature/integrante-1`, `feature/integrante-2`, `feature/integrante-3`, `feature/integrante-4`
- OpenAPI specifications exportable for code generation
- CI/CD pipelines for API validation and deployment
- Role-based access control implementing XOR reservation ownership (each reservation belongs exclusively to a socio or invitado)
- Real-time stock validation for equipment
- Users with suspended status cannot perform any reservation or rental
- Self-service reservation cancellation for Socios via `DELETE /api/v1/reservations/:id` with 24 h advance notice and ownership validation
- Database operations using PostgreSQL via Supabase
- Frontend generated from the same spec files (SDD), ensuring 1:1 mapping between screens and API endpoints

This proposal establishes the "why" and "what" - implementation details belong in design.md and tasks.md.

---

*Generated by OpenSpec spec-driven workflow for club-deportivo-reservas change*
# Design

## Context

This design for the Sports Club Reservation System follows the specifications defined in the proposal.md and the 4 module specs (gestion-usuarios-personas, gestion-instalaciones-horarios, gestion-reservas-turnos, pagos-auditoria-notificaciones). All endpoints are designed using OpenAPI 3.0 and follow REST conventions.

The architecture supports 4 independent feature branches working in parallel without conflict, allowing the 4 team members to develop their modules concurrently.

## Goals / Non-Goals

**Goals:**
- Define complete OpenAPI 3.0 contracts for all 4 modules
- Enable parallel development in separate Git branches
- Support CI/CD pipelines for API validation and deployment
- Use role-based access control with XOR reservation ownership
- Implement real-time stock validation for equipment rentals
- Support suspended user prevention logic
- Provide clear integration points between modules

**Non-Goals:**
- Implementation of business logic (belongs in implementation phase)
- Database migration scripts (SQL files are source of truth)
- Specific authentication implementation details (OAuth2, JWT configs)
- Exact payment gateway integration details

## Decisions

### API Specification Format: OpenAPI 3.0

Chosen for its industry-wide adoption, tooling support, and code generation capabilities. Enables server stubs and client SDK generation in multiple languages.

### Module Separation by Feature Branch

Each module developed in independent branch to avoid merge conflicts:
- `gestión-usuarios-personas` → `feature/integrante-1` (Integrante 1: Gestión de usuarios y roles)
- `gestión-instalaciones-horarios` → `feature/integrante-2` (Integrante 3: Gestión de instalaciones y horarios)
- `gestión-reservas-turnos` → `feature/integrante-3` (Integrante 2: Creación y mantenimiento de reservas)
- `pagos-auditoria-notificaciones` → `feature/integrante-4` (Integrante 4: Pagos, auditoría y generación de reportes)

### RESTful Conventions

All endpoints follow REST conventions with JSON request/response bodies. HTTP methods mapped to operations:
- GET → Read/List operations
- POST → Create operations
- PUT/PATCH → Update operations
- DELETE → Remove operations

### Role-Based Access Control with XOR Ownership

Each reservation belongs exclusively to a socio OR invitado (XOR), never both. The system enforces this constraint at the API level with validation on reservation creation and modification.

### Real-Time Stock Validation

Equipment rental requests must validate available stock in real-time before creating the rental. The system rejects rentals if insufficient stock exists and increments stock count after equipment return.

### Suspended User Prevention

Users with suspended status cannot perform any reservation or equipment rental. This check occurs at API gateway level before processing any create operations.

### Self-Service Reservation Cancellation

Socios can cancel their own `AUTOGESTIONADA` reservations via `DELETE /api/v1/reservations/:id`, reusing the existing 24 h advance notice policy. Key design decisions:

- **Endpoint**: `DELETE /api/v1/reservations/:id` (REST semantic for resource removal) — separate from the manager's `PATCH /reservations/:id/status` to keep concerns isolated.
- **Guards**: `AuthGuard('jwt')` + `SuspendedUserGuard` (suspended Socios cannot cancel).
- **Ownership**: Resolve `id_persona` from `usuario.id_persona` and compare with `reserva.id_persona`; mismatch → `403 Forbidden`.
- **Reuse**: The 24 h advance notice validation is extracted to a shared private method `validarAnticipacionCancelacion()` used by both the manager `PATCH` and the Socio `DELETE`.
- **State transition**: Only `CONFIRMADA → CANCELADA` for Socios (cannot cancel in-progress or completed reservations).
- **Idempotency**: Cancelling an already `CANCELADA` reservation returns `400` (not `204`) for error clarity.

### UI Design System: Dual-Theme Semantic Tokens

Following the SDD methodology defined in `proposal.md`, the UI is generated from the same spec files that drive the backend. The design system is defined in two core artifacts:

- **`docs/pantallas.md`** — 27 screens across 4 roles with routes, form fields, validations, and navigation flows
- **`docs/colores.md`** — Dual-theme palette ("Cancha de Día" light / "Cancha de Noche" dark) with semantic color tokens

#### Semantic Color Token Architecture

Colors are defined as **semantic tokens** — named by function, not hex value — enabling automatic theme switching via CSS custom properties. The system uses a `prefers-color-scheme` media query with a manual toggle override stored in `localStorage`.

**Token mapping table:**

| Token | Light (`#hex`) | Dark (`#hex`) | Applied to |
|---|---|---|---|
| `--color-primary` | `#0E9F6E` | `#22C55E` | Primary buttons, active tabs, `DISPONIBLE` status badge |
| `--color-primary-hover` | `#0B7A55` | `#4ADE80` | `:hover` / `:active` pseudo-classes |
| `--color-secondary` | `#0F172A` | `#60A5FA` | Nav headers, price text (light) / links, filters, location icon (dark) |
| `--color-accent` | `#F59E0B` | `#FBBF24` | CTA secondary, "Quedan pocos turnos" badge, promo labels |
| `--color-bg` | `#F8FAFC` | `#070F1E` | `<body>` / page background |
| `--color-surface` | `#FFFFFF` | `#111F35` | Cards, modals, dialogs |
| `--color-surface-2` | `#F1F5F9` | `#1A2E4D` | Time-slot grid cells, secondary panels |
| `--color-text-primary` | `#0F172A` | `#F1F5F9` | Headings, body text (AA+ contrast guaranteed) |
| `--color-text-secondary` | `#64748B` | `#94A3B8` | Descriptions, captions, placeholder text |
| `--color-border` | `#E2E8F0` | `#1E3A5F` | `<hr>`, input borders, card separators |
| `--color-success` | `#16A34A` | `#4ADE80` | `CONFIRMADA` / `COMPLETADA` / `DEVUELTO` badges |
| `--color-warning` | `#F59E0B` | `#FBBF24` | `PENDIENTE` / `DEVUELTO_TARDE` badges |
| `--color-error` | `#EF4444` | `#F87171` | `CANCELADA` / `SUSPENDIDO` / `NO_DEVUELTO` / `RECHAZADA` badges |

**Theme switching strategy:**
1. On load, read `localStorage.theme` — if `"dark"` or `"light"`, apply forcibly
2. If absent, fall back to `matchMedia('(prefers-color-scheme: dark)')`
3. A toggle button in the nav bar persists the user's choice
4. All components reference semantic tokens exclusively — never raw hex values

#### Screen Architecture

The 27 screens are organized in a **role-based hierarchy** where higher roles inherit all screens from lower roles:

```
Visitante (6 screens)
  └─ Socio (6 + 7 = 13 screens)
       └─ Gerente (13 + 7 = 20 screens)
            └─ Administrador (20 + 7 = 27 screens)
```

**Screen inventory by role:**

| # | Screen | Route | Visitante | Socio | Gerente | Admin | Primary Endpoint |
|---|---|---|---|---|---|---|---|
| 1 | Landing / Inicio | `/` | ✅ | ✅ | ✅ | ✅ | `GET /disciplines` |
| 2 | Registro | `/register` | ✅ | — | — | — | `POST /auth/register` |
| 3 | Iniciar Sesión | `/login` | ✅ | — | — | — | `POST /auth/login` |
| 4 | Disciplinas | `/disciplines` | ✅ | ✅ | ✅ | ✅ | `GET /disciplines` |
| 5 | Detalle Disciplina | `/disciplines/:id` | ✅ | ✅ | ✅ | ✅ | `GET /disciplines/:id` |
| 6 | Disponibilidad | `/availability` | ✅ | ✅ | ✅ | ✅ | `GET /time-slots/availability` |
| 7 | Mi Perfil | `/profile` | — | ✅ | ✅ | ✅ | `GET /profile` |
| 8 | Editar Perfil | `/profile/edit` | — | ✅ | ✅ | ✅ | `PUT /profile` |
| 9 | Mis Reservas | `/my-reservations` | — | ✅ | ✅ | ✅ | `GET /reservations` |
| 10 | Nueva Reserva | `/reservations/new` | — | ✅ | ✅ | ✅ | `POST /reservations` |
| 11 | Detalle Reserva | `/reservations/:id` | — | ✅ | ✅ | ✅ | `GET /reservations/:id`, `DELETE /reservations/:id` (cancelación autogestionada) |
| 12 | Alquilar Equipamiento | `/reservations/:id/rent-equipment` | — | ✅ | ✅ | ✅ | `POST /equipment-rentals` |
| 13 | Mis Pagos | `/my-payments` | — | ✅ | ✅ | ✅ | `GET /payments` |
| 14 | Solicitudes de Permiso | `/permission-requests` | — | — | ✅ | ✅ | `GET /permission-requests` |
| 15 | Revisar Solicitud | `/permission-requests/:id` | — | — | ✅ | ✅ | `PATCH /permission-requests/:id` |
| 16 | Gestión de Reservas | `/reservations/manage` | — | — | ✅ | ✅ | `GET /reservations` |
| 17 | Control de Reserva | `/reservations/:id/manage` | — | — | ✅ | ✅ | `PATCH /reservations/:id/status` |
| 18 | Devolución Equipamiento | `/equipment-rentals/:id/return` | — | — | ✅ | ✅ | `PATCH /equipment-rentals/:id/return` |
| 19 | Registrar Pago | `/payments/new` | — | — | ✅ | ✅ | `POST /payments` |
| 20 | Enviar Notificación | `/notifications/send` | — | — | ✅ | ✅ | `POST /notifications` |
| 21 | Gestión de Usuarios | `/admin/users` | — | — | — | ✅ | `GET /users` |
| 22 | Gestionar Estado Usuario | `/admin/users/:id` | — | — | — | ✅ | `PATCH /users/:id/status` |
| 23 | CRUD Disciplinas | `/admin/disciplines` | — | — | — | ✅ | `POST/PUT/DELETE /disciplines` |
| 24 | CRUD Canchas | `/admin/courts` | — | — | — | ✅ | `POST/PUT/DELETE /courts` |
| 25 | CRUD Franjas Horarias | `/admin/time-slots` | — | — | — | ✅ | `POST/DELETE /time-slots` |
| 26 | Panel de Auditoría | `/admin/audit` | — | — | — | ✅ | `GET /audit-logs` |
| 27 | Reporte de Auditoría | `/admin/audit/report` | — | — | — | ✅ | `GET /audit-logs/report` |

#### Key Screen Design Decisions

**New Reservation — 3-step wizard:**
The reservation flow is split into three sequential steps to reduce cognitive load and enable progressive data loading:
1. **Step 1 (Discipline & Court):** `GET /disciplines` → `GET /courts?discipline_id=X`. Shows court name, surface, and base price.
2. **Step 2 (Date & Time Slot):** Date picker + `GET /time-slots/availability?court_id=X&date=YYYY-MM-DD`. Renders a grid with 🟢 free / 🔴 occupied slots using `--color-primary` and `--color-error` tokens.
3. **Step 3 (Confirm):** Summary card + `POST /reservations`. Displays inline validation errors from the API (court in maintenance, slot conflict, max 2 active reservations, suspended account).

**Status badges — consistent color semantics:**
Every entity state in the system maps to a single semantic color token, ensuring visual consistency across all 27 screens:
- 🟢 `--color-success`: `CONFIRMADA`, `COMPLETADA`, `DEVUELTO`, `APROBADA`, `ACTIVO`, `DISPONIBLE`
- 🟡 `--color-warning`: `PENDIENTE` (user & permission), `DEVUELTO_TARDE`
- 🔴 `--color-error`: `CANCELADA`, `SUSPENDIDO`, `NO_DEVUELTO`, `RECHAZADA`, `MANTENIMIENTO`
- 🔵 `--color-secondary` (dark) / slate (light): `EN_CURSO`

**Role-based UI rendering:**
The frontend mirrors the backend `RolesGuard` + `roles.decorator.ts` logic. Navigation menus, route guards, and action buttons are conditionally rendered based on the JWT payload role. Screens that require `GERENTE` or `ADMINISTRADOR` are hidden from navigation (not just protected by route guards) for non-authorized roles.

#### Frontend Technology Stack

| Layer | Choice | Rationale |
|---|---|---|
| Framework | React 18+ / Next.js (App Router) or Vue 3 / Nuxt 3 | SPA with SSR for public pages (SEO for disciplines/availability) |
| Language | TypeScript 5+ | Type safety aligned with backend NestJS + Prisma types |
| Styling | Tailwind CSS v4 + CSS custom properties | Utility-first with `@theme` mapping to semantic tokens from `colores.md` |
| Server state | TanStack Query (React Query) v5 | Declarative server-state caching with stale-while-revalidate aligned to REST endpoints |
| Form handling | React Hook Form + Zod | Schema validation that mirrors backend DTO constraints (`class-validator` decorators) |
| Routing | File-based routing | Next.js App Router or Nuxt Pages — matches suggested routes in `pantallas.md` |
| HTTP client | `fetch` + interceptor pattern | Attach JWT `Authorization: Bearer` header; handle 401 → redirect to `/login` |
| Auth | JWT in `Authorization` header | Same strategy as `jwt.strategy.ts`; decode payload for role-based rendering |
| Theme | `prefers-color-scheme` + toggle | CSS custom properties swapped via `document.documentElement.dataset.theme` |

#### Spec-to-Screen Traceability

Every screen is traceable back to exactly one capability spec, ensuring that the SDD pipeline remains intact:

| Capability Spec | Backend Module | UI Screens (#) |
|---|---|---|
| `gestion-usuarios-personas` | `usuarios/` + `auth/` | Landing, Register, Login, Profile, Edit Profile, Permission Requests, Review Request, User Management, User Status (9) |
| `gestion-instalaciones-horarios` | `instalaciones/` | Disciplines, Discipline Detail, Availability, CRUD Disciplines, CRUD Courts, CRUD Time Slots (6) |
| `gestion-reservas-turnos` | `reservas/` | My Reservations, New Reservation, Reservation Detail (incl. self-service cancel via `DELETE`), Rent Equipment, Reservation Management, Reservation Control, Equipment Return (7) |
| `pagos-auditoria-notificaciones` | `pagos/` | My Payments, Register Payment, Send Notification, Audit Panel, Audit Report (5) |

## Risks / Trade-offs

- **Risk**: Module coupling if API contracts change after branch divergence
  - **Mitigation**: Freeze API specs before branch creation; use openspec validate before merging

- **Risk**: Inconsistent interpretation of XOR constraint across branches
  - **Mitigation**: All branches use same spec files as source of truth; validate with openspec validate --strict

- **Risk**: Real-time stock validation race conditions
  - **Mitigation**: Implement database-level locking or optimistic concurrency control for stock updates

- **Risk**: Theme token drift — UI components using raw hex values instead of semantic tokens
  - **Mitigation**: Enforce via ESLint rule (`no-color-literals`) and Tailwind `@theme` config that only exposes semantic token names; code review checklist includes token compliance

- **Risk**: Screen-to-endpoint mismatch — a screen calling the wrong endpoint or missing a required field
  - **Mitigation**: The screen inventory table in `pantallas.md` serves as the traceability matrix; each screen's form fields are derived from the corresponding DTO in the backend module

- **Risk**: Role-based UI rendering out of sync with backend `RolesGuard`
  - **Mitigation**: Both frontend route guards and backend guards read from the same JWT payload role; a shared `Role` enum in a common package ensures consistency

- **Trade-off**: Development speed vs. specification completeness
  - **Decision**: Prioritize complete OpenAPI specs first, implement incrementally

- **Trade-off**: Single-page application (SPA) vs. multi-page with SSR
  - **Decision**: Use a hybrid approach — SSR for public pages (Landing, Disciplines, Availability) for SEO and fast first paint; SPA for authenticated pages behind login to simplify auth state management

## Open Questions

- None (all requirements resolved in proposal and specs phases)

---

*Design generated following spec-driven workflow for club-deportivo-reservas change*
*Reference proposal.md for business motivation and scope*
*Reference specs/*.md for detailed requirements per module*
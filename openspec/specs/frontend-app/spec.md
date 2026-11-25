# frontend-app Specification

## Purpose
Definir las reglas de renderizado del frontend para que `next build` termine correctamente (y por lo tanto exista un deployment) y para que los listados de entidades reflejen el contrato real del API, incluyendo las entidades que no tienen columna `estado`.

## Requirements

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

### Requirement: Consumo de respuestas normalizadas en pantallas públicas
The system SHALL pass every `Disciplina` and `Cancha` response consumed by a public page through `normalizeDisciplina()` / `normalizeCancha()` before storing it in the query cache, and SHALL NOT type a raw API response as an already-normalized entity. The normalized `id` SHALL be a valid UUID usable as a link target and as an option value.

#### Scenario: Disciplina en un `<select>` (el dropdown de canchas vacío)
- **WHEN** a user opens `/availability` and selects a discipline whose raw payload is `{ "id_disciplina": "8b1e...", "nombre": "Fútbol 5" }`
- **THEN** the option value is the UUID `8b1e...`, not the discipline name
- **AND** the subsequent `GET /courts?discipline_id=8b1e...` returns the courts instead of failing with an invalid-UUID error

#### Scenario: Enlace al detalle de una disciplina
- **WHEN** a user clicks a discipline card in `/disciplinas` or in the home page
- **THEN** the browser navigates to `/disciplinas/<uuid>` and the page renders, instead of navigating to `/disciplinas/undefined` and returning 404

#### Scenario: Enlace a la disponibilidad desde el detalle
- **WHEN** a user clicks "Ver disponibilidad" in `/disciplinas/:id`
- **THEN** the resulting URL carries `discipline_id=<uuid>` and `/availability` starts with that discipline already selected

#### Scenario:llave de React y valores de opción
- **WHEN** a page renders a list of disciplines or courts
- **THEN** every `key` and every `value` is a non-empty UUID

### Requirement: Conteo de canchas desde `_count` con fallback al array embebido
The system SHALL read the number of courts of a discipline from `_count.canchas` when the API provides it, SHALL fall back to the length of the embedded `canchas` array when it does not, and SHALL resolve this through a single shared helper.

#### Scenario: Respuesta de colección con `_count`
- **WHEN** the API returns a discipline as `{ "id_disciplina": "...", "_count": { "canchas": 1 } }`
- **THEN** the listing displays "1 cancha disponible" and does not derive the count from an absent `canchas` array

#### Scenario: Respuesta de detalle con `canchas` embebido
- **WHEN** the API returns a discipline with a `canchas` array and no `_count`
- **THEN** the listing displays the length of that array

#### Scenario: `_count` con array truncado
- **WHEN** the API returns both `_count.canchas` and a shorter `canchas` array (pagination)
- **THEN** the displayed count is `_count.canchas`

#### Scenario: Disciplina sin canchas
- **WHEN** the API returns `_count: { canchas: 0 }`
- **THEN** the listing displays "0 canchas disponibles" rather than hiding the count

#### Scenario: Helper único de conteo
- **WHEN** a page needs to show how many courts a discipline has
- **THEN** it calls the shared `courtCount()` helper rather than reading `canchas.length` directly

### Requirement: Tipos alineados con la base de datos
The system SHALL declare in its TypeScript types every `estado` value the database can actually return for that entity, so that a value present in a column is not silently cast away by a normalizer.

#### Scenario: Estado real de una cancha
- **WHEN** the API returns `estado: "DISPONIBLE"` for a court, which is the default of `Cancha.estado` in the schema
- **THEN** `CourtStatus` includes `"DISPONIBLE"` and the court badge renders it without falling to an unknown branch

### Requirement: Disponibilidad pública sin sesión iniciada
The system SHALL allow a visitor without an account to browse disciplines, their courts and the time-slot availability of a court, and SHALL only require sign-in when the visitor starts a reservation.

#### Scenario: Visitante sin sesión
- **WHEN** a visitor who has not signed in opens `/disciplinas`, `/disciplinas/:id` or `/availability`
- **THEN** the pages render their data and are not redirected to `/login`

#### Scenario: El visitante intenta reservar
- **WHEN** a visitor without an account chooses a court and a free slot
- **THEN** the page offers a sign-in call to action instead of starting the reservation

### Requirement: RF-FE-01 Aviso visible para cuentas no ACTIVAS en pantallas de reservas

El sistema SHALL mostrar, cuando una persona autenticada tiene `estado` distinto de `ACTIVO`, un aviso explicativo en lugar del contenido de reserva en `Mis reservas` (`/my-reservations`), `Nueva reserva` (`/reservations/new`) y `Alquilar equipamiento` (`/reservations/:id/rent-equipment`). El aviso SHALL incluir un enlace visible a `Mi perfil` (`/profile`) y un indicador de estado que muestre el `estado` real del usuario (por ejemplo `PENDIENTE` o `INACTIVO`). El aviso SHALL contener exactamente "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar." cuando `estado = 'PENDIENTE'`, y exactamente "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club." para cualquier otro `estado` distinto de `ACTIVO`. El sistema NO SHALL renderizar una página vacía ni exponer acciones para crear, cancelar o alquilar en esas pantallas mientras la cuenta no esté `ACTIVO`.

#### Scenario: Socio PENDIENTE abre Mis reservas
- **WHEN** un `SOCIO` autenticado con `estado = 'PENDIENTE'` abre `/my-reservations`
- **THEN** se ve el aviso con el texto exacto "Tu cuenta está pendiente de aprobación. Mientras tanto podés ver tu perfil, pero todavía no podés reservar.", el indicador `PENDIENTE` y el enlace a `/profile`
- **AND** no se ve una pantalla vacía ni el botón "Nueva reserva"

#### Scenario: Socio PENDIENTE abre Nueva reserva
- **WHEN** un `SOCIO` autenticado con `estado = 'PENDIENTE'` abre `/reservations/new`
- **THEN** se ve el mismo texto de `PENDIENTE`, el indicador `PENDIENTE` y el enlace a `/profile`
- **AND** no se muestran los pasos de disciplina, cancha, franja ni el botón "Confirmar reserva"

#### Scenario: Usuario INACTIVO intenta alquilar equipamiento
- **WHEN** un usuario autenticado con `estado = 'INACTIVO'` abre `/reservations/<uuid>/rent-equipment`
- **THEN** se ve el texto exacto "Tu cuenta no está activa. Mientras tanto podés ver tu perfil, pero todavía no podés reservar. Comunicate con el club." y el indicador `INACTIVO`
- **AND** se ve el enlace a `/profile`, no se puede seleccionar equipamiento ni confirmar el alquiler, y no aparece una pantalla vacía

#### Scenario: Usuario ACTIVO conserva sus pantallas
- **WHEN** un `SOCIO` autenticado con `estado = 'ACTIVO'` abre `/my-reservations`
- **THEN** se muestran sus reservas, el contador de reservas activas y el botón "Nueva reserva" como antes
- **AND** no se muestra el aviso de cuenta pendiente

### Requirement: RF-FE-02 Destino del login según estado de la cuenta

El sistema SHALL redirigir a `/` (Inicio) después de un inicio de sesión exitoso cuando el `estado` devuelto para el usuario sea distinto de `ACTIVO`, ignorando cualquier parámetro `redirect` y el destino por rol. Cuando el `estado` sea `ACTIVO`, el sistema SHALL conservar el comportamiento vigente: usar `redirect` si está presente y, si no, el destino según el rol (`ADMINISTRADOR` → `/admin/users`, `GERENTE` → `/permission-requests`, `SOCIO` → `/my-reservations`).

#### Scenario: Usuario PENDIENTE con parámetro redirect
- **WHEN** un `SOCIO` con `estado = 'PENDIENTE'` inicia sesión desde `/login?redirect=%2Fmy-reservations` y el backend responde `200` con su sesión
- **THEN** el navegador termina en `/` (Inicio)
- **AND** no se abre `/my-reservations` aunque exista el parámetro `redirect`

#### Scenario: Usuario ACTIVO con parámetro redirect
- **WHEN** un `SOCIO` con `estado = 'ACTIVO'` inicia sesión desde `/login?redirect=%2Freservations%2Fnew`
- **THEN** el navegador termina en `/reservations/new`

#### Scenario: Usuario ACTIVO sin parámetro redirect
- **WHEN** un `SOCIO` con `estado = 'ACTIVO'` inicia sesión desde `/login` sin parámetro `redirect`
- **THEN** el navegador termina en `/my-reservations`, según su rol

### Requirement: RF-FE-03 Sesión inexistente sigue redirigiendo al login

El sistema SHALL seguir enviando a `/login` a quien intente abrir una ruta protegida sin sesión, manteniendo el parámetro `redirect` con la ruta solicitada, y NO SHALL mostrar el aviso de cuenta no `ACTIVA` a visitantes sin autenticar.

#### Scenario: Visitante abre Mis reservas sin sesión
- **WHEN** una persona sin cookie de sesión abre `/my-reservations`
- **THEN** el navegador es redirigido a `/login?redirect=%2Fmy-reservations`
- **AND** no se muestra el aviso de cuenta pendiente

#### Scenario: Visitante abre una ruta protegida de alquiler sin sesión
- **WHEN** una persona sin cookie de sesión abre `/reservations/<uuid>/rent-equipment`
- **THEN** el navegador es redirigido a `/login` con `redirect` igual a la ruta solicitada codificada

#### Scenario: Visitante navega rutas públicas
- **WHEN** una persona sin sesión abre `/`, `/disciplines` o `/availability`
- **THEN** la página se muestra sin redirección a `/login` y sin el aviso de cuenta pendiente

# Tasks

## 1. Gestión de Usuarios y Personas

- [x] 1.1 Configurar estructura del módulo `gestión-usuarios-personas` y verificar archivos esperados
- [x] 1.2 Implementar controladores de registro de usuarios según esquema SQL `persona.sql`
- [x] 1.3 Implementar controladores de autenticación y generación de tokens JWT
- [x] 1.4 Crear endpoints POST /api/v1/auth/register y POST /api/v1/auth/login
- [x] 1.5 Implementar middleware de autorización por rol (socio, gerente, administrador, invitado)
- [x] 1.6 Probar endpoints de autenticación con casos de éxito y error (unit tests)
- [x] 1.7 Implementar validación de usuarios suspendidos (bloqueo de reservas y alquileres)
- [x] 1.8 Probar control de roles y permisos por escenario (unit tests)

## 2. Gestión de Instalaciones y Horarios

- [x] 2.1 Configurar estructura del módulo `gestión-instalaciones-horarios`
- [x] 2.2 Implementar CRUD de disciplinas deportivas (POST, GET, PUT, DELETE /api/v1/disciplines)
- [x] 2.3 Implementar CRUD de canchas asociadas a disciplinas (/api/v1/courts)
- [x] 2.4 Crear endpoints de franjas horarias (/api/v1/time-slots) con validación de disponibilidad
- [ ] 2.5 Integrar validación con esquemas SQL `esquemaUltimo.sql` y `esquema-final.sql`
- [x] 2.6 Probar gestión de canchas y horarios con casos de borde (unit tests)
- [x] 2.7 Implementar validación de disciplinas soportadas (Tenis, Fútbol, Pádel)
- [x] 2.8 Probar creación de disciplinas y canchas por escenario (unit tests)

## 3. Gestión de Reservas y Turnos

- [x] 3.1 Configurar estructura del módulo `gestión-reservas-turnos`
- [x] 3.2 Implementar creación de reservas principales (POST /api/v1/reservations)
- [x] 3.3 Implementar endpoints de consulta de reservas por usuario y fecha (/api/v1/reservations)
- [x] 3.4 Implementar alquiler de equipamiento asociado a reservas (/api/v1/equipment-rentals)
- [x] 3.5 Validar conflictos de tiempo y evitar dobles reservas
- [x] 3.6 Implementar procesamiento de devoluciones de equipamiento
- [x] 3.7 Implementar validación XOR de propietario de reserva (socio O invitado, nunca ambos)
- [x] 3.8 Probar creación de reservas y manejo de conflictos (unit tests)
- [x] 3.9 Implementar validación de stock en tiempo real para equipamiento
- [x] 3.10 Probar flujo de reserva con validación de stock y conflictos (unit tests)
- [ ] 3.11 Implementar endpoint `DELETE /api/v1/reservations/:id` para cancelación autogestionada del Socio
- [ ] 3.12 Extraer validación de anticipación (`validarAnticipacionCancelacion`) para reuso en `PATCH` (gerentes) y `DELETE` (socio)
- [ ] 3.13 Implementar validación de titularidad: solo el Socio dueño de la reserva puede cancelarla (403 si es ajena)
- [ ] 3.14 Validar transición de estado: solo `CONFIRMADA → CANCELADA` para el Socio (400 si no está CONFIRMADA)
- [ ] 3.15 Probar cancelación autogestionada: éxito, reserva ajena (403), sin anticipación (400), estado no CONFIRMADA (400)

## 4. Pagos, Auditoría y Notificaciones

- [x] 4.1 Configurar estructura del módulo `pagos-auditoria-notificaciones`
- [x] 4.2 Implementar registro de pagos asociados a reservas (/api/v1/payments)
- [x] 4.3 Implementar consulta de estado de pagos (pending, completed, failed, refunded)
- [x] 4.4 Crear sistema de auditoría de actividades del usuario (/api/v1/audit-logs)
- [x] 4.5 Implementar notificaciones por email para confirmaciones de reserva
- [x] 4.6 Implementar notificaciones de estado de pago y recordatorios
- [x] 4.7 Implementar validación de stock en tiempo real para equipamiento
- [x] 4.8 Implementar bloqueo de usuarios suspendidos (prohibir reservas y alquileres)
- [x] 4.9 Probar flujo de pagos y notificaciones completas (unit tests)
- [x] 4.10 Probar bloqueo de usuario suspendido en operaciones de reserva y rental (unit tests)

## 5. Integración y Validación

- [ ] 5.1 Generar servidores cliente y stubs a partir de specifications OpenAPI
- [ ] 5.2 Configurar validación OpenAPI en pipeline CI (pre-commit hook)
- [ ] 5.3 Probar integración entre los 4 módulos en entorno de pruebas
- [ ] 5.4 Ejecutar `openspec validate --strict` y corregir cualquier inconsistencia
- [ ] 5.5 Desplegar versión de prueba y verificar endpoints integrados
- [ ] 5.6 Verificar validación XOR en operaciones de reserva
- [ ] 5.7 Verificar bloqueo de usuario suspendido en todas las operaciones
- [ ] 5.8 Verificar validación de stock en tiempo real en escenarios de rental

## 6. Generación de la Interfaz de Usuario (SDD)

> **Fase SDD:** La UI se genera a partir de los mismos archivos de especificación que el backend.  
> **Artefactos fuente:** `docs/pantallas.md` (27 pantallas), `docs/colores.md` (tokens semánticos dual-theme).  
> **Stack:** React 18+ / Next.js (App Router) o Vue 3 / Nuxt 3, Tailwind CSS v4, TanStack Query v5, React Hook Form + Zod.

### 6.1 Configuración del proyecto frontend

- [x] 6.1.1 Inicializar proyecto frontend con Next.js (App Router) o Nuxt 3 + TypeScript 5
- [x] 6.1.2 Configurar Tailwind CSS v4 con `@theme` mapping a tokens semánticos de `docs/colores.md`
- [x] 6.1.3 Crear archivo `tokens.css` con las 13 variables CSS custom properties (light/dark) y la estrategia de theme switching (`localStorage` → `prefers-color-scheme` → toggle)
- [x] 6.1.4 Configurar ESLint con regla `no-color-literals` para prevenir uso de hex values crudos
- [x] 6.1.5 Configurar TanStack Query v5 con `QueryClientProvider` y `staleTime: 30s` por defecto
- [x] 6.1.6 Configurar cliente HTTP con interceptor para adjuntar JWT `Authorization: Bearer` y manejar 401 → redirect a `/login`
- [x] 6.1.7 Configurar sistema de rutas con middleware de autenticación por rol (leer `rol` del payload JWT)
- [x] 6.1.8 Crear tipos TypeScript compartidos (`Role`, `UserStatus`, `ReservationStatus`, etc.) alineados con los DTOs del backend

### 6.2 Componentes transversales (Design System)

- [x] 6.2.1 Crear componente `ThemeToggle` (botón sol/luna en navbar, persiste en `localStorage`)
- [x] 6.2.2 Crear componente `StatusBadge` que mapea estados a tokens semánticos (🟢 success / 🟡 warning / 🔴 error / 🔵 info)
- [x] 6.2.3 Crear componente `Navbar` con renderizado condicional por rol (menús visibles según `SOCIO` / `GERENTE` / `ADMINISTRADOR`)
- [x] 6.2.4 Crear componente `Sidebar` / `AdminSidebar` para navegación en panels de gestión
- [x] 6.2.5 Crear componente `TimeSlotGrid` reutilizable (grilla de franjas 🟢 libre / 🔴 ocupada)
- [x] 6.2.6 Crear componente `ReservationCard` reutilizable (fecha, disciplina, cancha, horario, estado, monto)
- [x] 6.2.7 Crear componente `DataTable` con filtros, ordenamiento y paginación para paneles admin
- [x] 6.2.8 Crear layouts base: `PublicLayout`, `AuthenticatedLayout`, `AdminLayout`

### 6.3 Pantallas públicas (Visitante) — 6 pantallas

- [x] 6.3.1 **Landing (`/`):** Hero con botones Login/Register, cards de disciplinas destacadas (`GET /disciplines`), sección "¿Cómo funciona?"
- [x] 6.3.2 **Registro (`/register`):** Formulario con DNI, CUIL, nombre, apellido, fecha nacimiento, email, teléfono, contraseña → `POST /auth/register`. Mostrar mensaje post-registro: *"Tu solicitud fue enviada. Un gerente la revisará pronto."*
- [x] 6.3.3 **Login (`/login`):** Formulario email + password → `POST /auth/login`. Redirigir según rol. Mostrar error si usuario `SUSPENDIDO`
- [x] 6.3.4 **Disciplinas (`/disciplines`):** Listado de cards con nombre, descripción, cantidad de canchas. Búsqueda/filtro por nombre → `GET /disciplines`
- [x] 6.3.5 **Detalle Disciplina (`/disciplines/:id`):** Info disciplina + listado de canchas (nombre, superficie, precio, estado) + equipamiento disponible → `GET /disciplines/:id`
- [x] 6.3.6 **Disponibilidad (`/availability`):** Selector disciplina → selector cancha → date picker → grilla `TimeSlotGrid` con 🟢/🔴 → `GET /time-slots/availability`

### 6.4 Pantallas del Socio — 7 pantallas

- [x] 6.4.1 **Mi Perfil (`/profile`):** Datos personales (nombre, apellido, DNI, CUIL, fecha nacimiento), contactos (email, teléfono), estado de cuenta (rol, estado) → `GET /profile`
- [x] 6.4.2 **Editar Perfil (`/profile/edit`):** Formulario nombre, apellido, email, teléfono → `PUT /profile`. Mostrar aviso de que el contacto anterior se inactiva
- [x] 6.4.3 **Mis Reservas (`/my-reservations`):** Listado de `ReservationCard` con filtros por fecha y estado. Badges de estado con `StatusBadge`. Mostrar reglas: máx 2 activas, cancelación 24h anticipación → `GET /reservations?person_id={mi_id}`
- [x] 6.4.4 **Nueva Reserva — Step 1 (`/reservations/new`):** Selector disciplina → selector cancha → info cancha (nombre, superficie, precio) → `GET /disciplines`, `GET /courts?discipline_id=X`
- [x] 6.4.5 **Nueva Reserva — Step 2:** Date picker + `TimeSlotGrid` con slots libres/ocupados → `GET /time-slots/availability?court_id=X&date=YYYY-MM-DD`
- [x] 6.4.6 **Nueva Reserva — Step 3:** Resumen (disciplina, cancha, fecha, horario, precio) + botón Confirmar → `POST /reservations`. Mostrar errores inline: cancha en mantenimiento, conflicto horario, límite 2 activas, cuenta suspendida
- [x] 6.4.7 **Detalle Reserva (`/reservations/:id`):** Datos reserva + equipamiento alquilado (items con estado devolución) + pagos realizados + botón Cancelar (si aplica: solo reservas `CONFIRMADA` propias con >24 h de anticipación) → `GET /reservations/:id`, `DELETE /reservations/:id` (cancelación autogestionada)
- [x] 6.4.8 **Alquilar Equipamiento (`/reservations/:id/rent-equipment`):** Listado equipamiento filtrado por disciplina de la cancha, campo cantidad por item, validaciones (misma disciplina, stock suficiente, no duplicado, usuario ACTIVO) → `POST /equipment-rentals`
- [x] 6.4.9 **Mis Pagos (`/my-payments`):** Listado de pagos con fecha, monto, reserva asociada. Filtros por rango de fechas → `GET /payments`

### 6.5 Pantallas del Gerente — 7 pantallas exclusivas

- [x] 6.5.1 **Solicitudes de Permiso (`/permission-requests`):** Listado de cards con nombre, apellido, DNI, email, fecha solicitud, estado. Filtro por estado. Badges: 🟡 Pendiente / 🟢 Aprobada / 🔴 Rechazada → `GET /permission-requests`
- [x] 6.5.2 **Revisar Solicitud (`/permission-requests/:id`):** Datos persona + contactos + botones Aprobar / Rechazar → `PATCH /permission-requests/:id`. Mostrar efecto: aprobar activa el usuario
- [x] 6.5.3 **Gestión de Reservas (`/reservations/manage`):** Listado de TODAS las reservas con filtros por persona, fecha, estado. Origen visible (`AUTOGESTIONADA` / `MANUAL_GERENCIA`) → `GET /reservations`
- [x] 6.5.4 **Control de Reserva (`/reservations/:id/manage`):** Detalle completo + acciones según estado: Check-in (`CONFIRMADA→EN_CURSO`), Completar (`EN_CURSO→COMPLETADA`), Cancelar (`CONFIRMADA/EN_CURSO→CANCELADA`) → `PATCH /reservations/:id/status`
- [x] 6.5.5 **Devolución Equipamiento (`/equipment-rentals/:id/return`):** Datos alquiler + botones Devuelto / Devuelto tarde / No devuelto → `PATCH /equipment-rentals/:id/return`. Mostrar efecto en stock
- [x] 6.5.6 **Registrar Pago (`/payments/new`):** Selector de reservas activas + campo monto + campo concepto → `POST /payments`
- [x] 6.5.7 **Enviar Notificación (`/notifications/send`):** Selector destinatario + asunto + mensaje (textarea) → `POST /notifications`

### 6.6 Pantallas del Administrador — 7 pantallas exclusivas

- [x] 6.6.1 **Gestión de Usuarios (`/admin/users`):** `DataTable` con nombre, email, rol, estado, fecha registro. Filtros por rol y estado. Badges con `StatusBadge` → `GET /users`
- [x] 6.6.2 **Gestionar Estado Usuario (`/admin/users/:id`):** Datos usuario + incumplimientos equipamiento + botones Suspender / Reactivar → `PATCH /users/:id/status`
- [x] 6.6.3 **CRUD Disciplinas (`/admin/disciplines`):** `DataTable` + modal crear/editar (nombre único, descripción) + eliminar con confirmación → `POST/PUT/DELETE /disciplines`
- [x] 6.6.4 **CRUD Canchas (`/admin/courts`):** `DataTable` con filtro por disciplina + modal crear/editar (disciplina, nombre, superficie, precio base, estado) + eliminar → `POST/PUT/DELETE /courts`
- [x] 6.6.5 **CRUD Franjas Horarias (`/admin/time-slots`):** `DataTable` con filtros por cancha y día + modal crear (cancha, día semana, hora inicio, hora fin) + eliminar → `POST/DELETE /time-slots`
- [x] 6.6.6 **Panel de Auditoría (`/admin/audit`):** `DataTable` con fecha, actor, evento, entidad, detalle. Filtros avanzados (fecha desde/hasta, usuario, entidad, evento). Límite 500 registros → `GET /audit-logs`
- [x] 6.6.7 **Reporte de Auditoría (`/admin/audit/report`):** Total eventos, eventos por tipo (gráfico/tabla), eventos por entidad, top 20 usuarios → `GET /audit-logs/report`

### 6.7 Integración frontend-backend y validación

- [x] 6.7.1 Verificar que cada pantalla tiene su endpoint correspondiente funcionando (traceability matrix `pantallas.md` ↔ specs)
- [x] 6.7.2 Probar flujo completo Visitante: Landing → Disciplinas → Detalle → Disponibilidad → Registro → Login
- [x] 6.7.3 Probar flujo completo Socio: Login → Dashboard → Nueva Reserva (3 pasos) → Detalle Reserva → Alquilar Equipamiento → Mis Pagos → Cancelar Reserva (autogestionada, `DELETE /reservations/:id`)
- [x] 6.7.4 Probar flujo completo Gerente: Login → Solicitudes Pendientes → Aprobar/Rechazar → Gestión Reservas → Check-in → Completar → Devolución Equipamiento → Registrar Pago
- [x] 6.7.5 Probar flujo completo Admin: Login → Gestión Usuarios → Suspender/Reactivar → CRUD Disciplinas → CRUD Canchas → CRUD Franjas → Auditoría → Reporte
- [x] 6.7.6 Validar que los badges de estado usan exclusivamente tokens semánticos (éxito, warning, error, info) en las 27 pantallas
- [x] 6.7.7 Validar theme switching: toggle manual + `prefers-color-scheme` + persistencia en `localStorage`
- [x] 6.7.8 Validar renderizado condicional por rol: menús y botones de acción coinciden con `RolesGuard` del backend
- [x] 6.7.9 Validar formularios: las validaciones del frontend (Zod) reflejan las restricciones de los DTOs del backend (`class-validator`)
- [x] 6.7.10 Prueba de responsive design en breakpoints: mobile (< 768px), tablet (768-1024px), desktop (> 1024px)
- [x] 6.7.11 Prueba de accesibilidad: contraste AA+ garantizado en ambos temas, navegación por teclado, atributos `aria-label` en botones de acción
- [x] 6.7.12 Auditoría final de cobertura: verificar que las 27 pantallas del inventario están implementadas y funcionales
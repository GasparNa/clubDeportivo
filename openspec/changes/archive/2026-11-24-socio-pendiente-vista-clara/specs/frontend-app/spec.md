## ADDED Requirements

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

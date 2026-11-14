# Casos de Prueba - Club Deportivo

Los UUID de cancha se toman del seed de desarrollo `backend/db/seed/20-seed.sql`.
Ese seed no incluye un socio: para CP-01 y CP-03 se debe preparar antes un
usuario de prueba con rol `SOCIO`, estado `ACTIVO` y una Persona asociada.
El campo **Resultado real** queda vacío para completarlo durante la ejecución.

## CP-01: Reserva exitosa de un socio ACTIVO

- **ID**: CP-01
- **Título**: Un socio ACTIVO reserva una cancha libre con anticipación
- **Requisito cubierto**: Creación de reservas principales, escenario `Successful court reservation`; también valida la regla de propietario ACTIVO.
- **Precondiciones**:
  - Existe un usuario de prueba con rol `SOCIO`, estado `ACTIVO` y Persona asociada.
  - El usuario no tiene reservas `CONFIRMADA` previas.
  - Existe una cancha del seed en estado disponible, por ejemplo `10000000-0000-4000-8000-000000000003` (Cancha Tenis 1).
  - Existe una franja horaria libre para esa cancha cuyo inicio sea posterior a 24 horas desde la ejecución.
- **Datos de entrada**:
  - `id_cancha`: UUID de la cancha disponible seleccionada.
  - `id_franja`: UUID de la franja horaria libre seleccionada.
  - `id_persona`: UUID de la Persona asociada al usuario `SOCIO` `ACTIVO`.
- **Pasos**:
  1. Autenticarse como el usuario de prueba `SOCIO` y `ACTIVO`.
  2. Enviar `POST /api/v1/reservations` con `id_cancha`, `id_franja` e `id_persona`.
  3. Verificar que la reserva fue creada y consultar su estado.
- **Resultado esperado**: Se crea una reserva `CONFIRMADA` para la Persona solicitante, sin conflicto de franja.
- **Resultado real**:

---

## CP-02: Rechazo por franja ocupada

- **ID**: CP-02
- **Título**: Un usuario intenta reservar una franja ya ocupada
- **Requisito cubierto**: Creación de reservas principales, escenario `Reservation conflict detection`.
- **Precondiciones**:
  - Existe una reserva `CONFIRMADA` para una cancha y franja horaria determinadas.
  - Se dispone de un usuario con permisos para solicitar una reserva.
- **Datos de entrada**:
  - `id_cancha`: UUID de la cancha de la reserva existente.
  - `id_franja`: UUID de la franja ya ocupada.
  - `id_persona`: UUID de la Persona del usuario solicitante.
- **Pasos**:
  1. Enviar `POST /api/v1/reservations` con la misma cancha y franja ocupadas.
  2. Verificar que la operación es rechazada.
  3. Verificar que la reserva original permanece sin cambios.
- **Resultado esperado**: El sistema rechaza la nueva reserva e informa el conflicto de franja; no se crea una segunda reserva para la misma cancha y franja.
- **Resultado real**:

---

## CP-03: Rechazo de la tercera reserva confirmada

- **ID**: CP-03
- **Título**: Un socio ACTIVO con dos reservas intenta crear una tercera
- **Requisito cubierto**: Límite de dos reservas confirmadas por usuario activo, escenario `Rechazar tercera reserva confirmada`.
- **Precondiciones**:
  - Existe un usuario de prueba con rol `SOCIO`, estado `ACTIVO` y Persona asociada.
  - Ese usuario tiene exactamente 2 reservas con estado `CONFIRMADA`.
  - Existe otra cancha y franja disponibles para intentar la tercera reserva.
- **Datos de entrada**:
  - `id_cancha`: UUID de la cancha disponible.
  - `id_franja`: UUID de una franja disponible.
  - `id_persona`: UUID de la Persona del usuario que ya tiene 2 reservas `CONFIRMADA`.
- **Pasos**:
  1. Autenticarse como el usuario `SOCIO` y `ACTIVO`.
  2. Verificar que tiene 2 reservas `CONFIRMADA`.
  3. Enviar `POST /api/v1/reservations` con los datos de entrada.
  4. Verificar que la tercera reserva no fue creada.
- **Resultado esperado**: El sistema rechaza la operación con el error `El usuario ya posee el máximo de 2 reservas confirmadas` y no crea la tercera reserva.
- **Resultado real**:
# Tasks

## CP-01: Reserva exitosa de socio ACTIVO con más de 24 horas

- [x] 1.1 **Precondición:** usuario con rol SOCIO y estado ACTIVO, con una cuenta de Persona válida, sin reservas previas
- [x] 1.2 **Datos de entrada:** court ID disponible, time slot ID con fecha y hora, id_persona del usuario ACTIVO, reserva con más de 24 horas de anticipación
- [x] 1.3 **Pasos:**
    1. Enviar solicitud POST `/api/v1/reservations` con los datos de entrada
    2. El sistema debe crear la reserva y retornarla con estado `CONFIRMADA`
- [x] 1.4 **Resultado esperado:** reserva creada con estado `CONFIRMADA`, y registrada en el historial de auditoría. No debe haber conflicto de franja. Trazado al requisito: "Validación XOR de propietario de reserva" (solo usuarios ACTIVO pueden reservar).

## CP-02: Conflicto de franja ocupada

- [x] 2.1 **Precondición:** ya existe una reserva `CONFIRMADA` para el mismo court y time slot
- [x] 2.2 **Datos de entrada:** intentar reservar el mismo court y time slot ya reservados
- [x] 2.3 **Pasos:**
    1. Enviar solicitud POST `/api/v1/reservations` con court y time slot ya reservados
    2. El sistema debe rechazar la operación
- [x] 2.4 **Resultado esperado:** sistema retorna un error indicando conflicto de franja. La reserva original permanece intacta. Trazado al requisito: "Creación de reservas principales" - el sistema SHALL rechazar la reserva cuando la franja ya está ocupada.

## CP-03: Rechazo de tercera reserva cuando ya existen 2 CONFIRMADA

- [x] 3.1 **Precondición:** usuario ACTIVO ya tiene 2 reservas con estado `CONFIRMADA`
- [x] 3.2 **Datos de entrada:** intentar crear una tercera reserva para el mismo usuario
- [x] 3.3 **Pasos:**
    1. Enviar solicitud POST `/api/v1/reservations` con un usuario que ya posee 2 reservas CONFIRMADA
    2. El sistema debe validar el límite
- [x] 3.4 **Resultado esperado:** sistema rechaza la operación con error "El usuario ya posee el máximo de 2 reservas confirmadas". La reserva no se crea. Trazado al requisito: "Límite de dos reservas confirmadas por usuario activo" - el sistema SHALL permitir un máximo de 2 reservas CONFIRMADA simultáneas por cada usuario con estado ACTIVO.
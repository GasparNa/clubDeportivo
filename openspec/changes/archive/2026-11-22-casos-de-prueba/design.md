# Design

## Context

El módulo `gestion-reservas-turnos` define las reglas de negocio para reservas y alquiler de equipamiento. Las reglas clave incluyen: una reserva pertenece a una Persona usuario ACTIVO, máximo 2 reservas CONFIRMADA por usuario, y validación de conflictos de franja horaria. Estos casos de prueba cubren escenarios críticos sin modificar el modelo de datos.

## Goals / Non-Goals

**Goals:**

- Validar el caso de reserva exitosa de un socio ACTIVO con más de 24 horas de anticipación (CP‑01).
- Detectar conflicto de franja ocupada al intentar reservar un turno ya reservado (CP‑02).
- Rechazar tercera reserva cuando el usuario ya tiene 2 reservas CONFIRMADA (CP‑03).

**Non-Goals:**

- Modificar el esquema de base de datos.
- Cambiar lógica de triggers.
- Implementar endpoints de API.
- No se incluyen pruebas automatizadas ni carga directa en Testiny; este change deja la documentación lista para ambos usos.

## Decisions

1. **Casos de prueba definidos** – Se definen tres casos de prueba (CP‑01 a CP‑03) que cubren los flujos críticos sin modificar el modelo de datos.

2. **Etiquetado** – Estos casos quedan bajo `skip_specs: true` para no afectar la validación OpenSpec global.

3. **Fuentes de referencia** – Los escenarios se trazan a `openspec/specs/gestion-reservas-turnos/spec.md` y `docs/pruebas.md`.

## Risks / Trade-offs

- Riesgo: Los casos de prueba pueden volverse obsoletes si cambian las reglas de negocio. Mitigación: actualizar cuando `gestion-reservas-turnos` spec evolucione.
- Trade-off: Al usar `skip_specs: true`, se evita la sobrecarga de validación de specs, pero se pierde la trazabilidad automática a requisitos de negocio.
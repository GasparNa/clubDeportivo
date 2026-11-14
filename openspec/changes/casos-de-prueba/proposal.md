# Proposal

## Why

El sistema de reservas requiere casos de prueba (Casos de Prueba - CP) que validen los flujos críticos de creación de reservas, detección de conflictos y límite de reservas confirmadas por usuario. Estos casos sirven como referencia para el desarrollo y la validación OpenSpec, y están basados en la especificación `gestion-reservas-turnos` y las definiciones de `docs/pruebas.md`. Al declarar `skip_specs: true`, no se modifican requisitos de negocio ni specs existentes; solo se documentan escenarios de prueba.

## What Changes

- Agregar tres casos de prueba (CP-01, CP-02, CP-03) al módulo de gestión de reservas.
- Definir precondiciones, datos de entrada y resultados esperados para cada caso.
- Marcar el change con `skip_specs: true` para evitar validación adicional de specs, ya que no hay cambios en el comportamiento del sistema.

## Capabilities

### New Capabilities

Ninguna. Este change no introduce nuevas capacidades de negocio; los casos de prueba validan reglas ya definidas en `gestion-reservas-turnos`.

### Modified Capabilities

Ninguna. No se modifican reglas de negocio existentes.

## Impact

- Ningún cambio en backend, frontend, base de datos ni infraestructura.
- Los casos de prueba son documentación devalidación y no afectan el código de producción.
- Se agrega `docs/casos-de-prueba.md` como documentación versionada del repositorio.
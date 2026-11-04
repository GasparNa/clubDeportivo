## Why

El frontend todavía necesitaba consolidar la identidad visual del club: el recurso oficial `logo.svg` debía utilizarse en la navegación principal y como icono del sitio. La carpeta `frontend/public` también conservaba recursos de plantilla que no pertenecían al sistema.

## What Changes

- Usar `frontend/public/logo.svg` como marca visible en el header compartido.
- Configurar `logo.svg` como icono del sitio y como Apple touch icon mediante la metadata de Next.js.
- Eliminar los recursos SVG de ejemplo de `frontend/public`.
- Eliminar el favicon heredado de `frontend/src/app` para evitar dos identidades visuales en la metadata generada.

## Capabilities

### New Capabilities
- `frontend-branding`: identidad visual compartida para la navegación y los iconos del sistema.

### Modified Capabilities
- Ninguna (no cambia contratos del API ni reglas de negocio).

## Impact

- **Frontend**: header compartido, metadata raíz de Next.js y assets públicos.
- **Backend / API**: sin cambios.
- **Base de datos**: sin migraciones.
- **Despliegue**: no requiere configuración adicional; el logo se sirve como asset estático.

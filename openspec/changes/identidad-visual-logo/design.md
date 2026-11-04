## Context

El frontend usa un `Navbar` compartido por los layouts público, autenticado y administrativo. El recurso de marca aprobado está en `frontend/public/logo.svg`, por lo que debe existir una única referencia reutilizable para evitar que el header muestre una marca alternativa como el monograma `CD`.

## Goals / Non-Goals

**Goals:**
- Mostrar el logo oficial en el enlace principal del header en todos los layouts que usan `Navbar`.
- Usar el mismo recurso para el favicon y el Apple touch icon.
- Mantener `public` libre de assets de ejemplo no utilizados.
- Conservar un tamaño estable y accesible en el header mediante `next/image` y texto alternativo.

**Non-Goals:**
- No rediseñar la navegación ni modificar sus rutas, permisos o estados activos.
- No generar una variante PNG, ICO o una copia adicional del logo.
- No modificar colores, tipografías ni reglas de negocio.

## Decisions

- Usar `next/image` con `src="/logo.svg"`, dimensiones explícitas y `priority` en el header para evitar cambios de layout y priorizar la marca visible.
- Declarar `metadata.icons.icon` y `metadata.icons.apple` apuntando al mismo asset SVG.
- Eliminar `favicon.ico` del directorio `app` porque la convención de Next.js lo publicaría junto con la metadata explícita.
- Conservar exclusivamente `logo.svg` en `frontend/public`.

## Risks / Trade-offs

- Algunos navegadores antiguos pueden preferir ICO frente a SVG; el navegador objetivo es Next.js moderno y el asset SVG es el recurso oficial definido por el equipo.
- El logo tiene una proporción casi cuadrada y se ajusta con `object-contain` para no deformarlo en el espacio fijo del header.

## Validation

- `pnpm --filter frontend run build` debe finalizar con exit code 0.
- `frontend/public` debe contener únicamente `logo.svg`.
- La página servida debe exponer en el header una imagen con alt `Club Deportivo` y no el monograma anterior.

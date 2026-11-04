## 1. Especificación SDD

- [x] 1.1 Crear la change `identidad-visual-logo` con proposal, delta spec, design y tasks.
- [x] 1.2 Documentar el uso del logo en el header, metadata del sitio y limpieza de assets.

## 2. Implementación del frontend

- [x] 2.1 Sustituir el monograma `CD` del `Navbar` por `frontend/public/logo.svg` usando `next/image`.
- [x] 2.2 Configurar `logo.svg` como icono general y Apple touch icon en la metadata raíz.
- [x] 2.3 Eliminar `file.svg`, `globe.svg`, `next.svg`, `vercel.svg` y `window.svg` de `frontend/public`.
- [x] 2.4 Eliminar el favicon heredado `frontend/src/app/favicon.ico`.

## 3. Verificación

- [x] 3.1 Ejecutar `pnpm --filter frontend run build` con resultado exitoso.
- [x] 3.2 Confirmar que `frontend/public` contiene únicamente `logo.svg`.
- [x] 3.3 Confirmar que `navbar.tsx` y `layout.tsx` no tienen errores del editor.
- [x] 3.4 Verificar en la aplicación servida que el header expone la imagen accesible `Club Deportivo`.

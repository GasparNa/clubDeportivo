---
name: club-deportivo-visual-design
description: "Define y aplica el sistema visual del frontend del Club Deportivo. Usar al crear, modificar o revisar pantallas, componentes, estilos, layouts, dashboards, formularios o estados visuales del frontend."
user-invocable: true
---

# Diseño Visual del Club Deportivo

## Propósito

Mantener una interfaz de gestión y reservas coherente con una dirección visual dark-first, tecnológica y sobria. Esta skill define decisiones de diseño, no identidad comercial: conservar siempre el nombre, dominio, textos y contexto funcional propios del Club Deportivo.

## Dirección visual

- Usar `#0C1A2B` como fondo global oscuro y `#132337` como superficie principal.
- Usar `#B4FF00` como acento primario para acciones principales, foco, selección, métricas positivas y elementos que necesiten atención.
- Mantener contraste alto: texto principal blanco, texto secundario `#94A3B8`, bordes sutiles `rgba(255,255,255,0.1)`.
- Preferir superficies oscuras ligeramente translúcidas, bordes finos y desenfoque moderado cuando aporten jerarquía. Evitar tarjetas decorativas anidadas.
- No introducir fondos blancos, grises claros, gradientes morados ni paletas genéricas de Tailwind en la estructura global.
- Los colores de disponibilidad, advertencia, error e información se toman exclusivamente de `docs/colores.md`.

## Tipografía

- Usar una sans expresiva y legible para títulos y marca visual, preferentemente Plus Jakarta Sans.
- Usar Inter para tablas, métricas, formularios y texto operativo.
- Reservar pesos altos para títulos y pesos medios para acciones. No usar tipografía display en tablas o paneles compactos.

## Componentes e interacción

- Priorizar layouts densos, escaneables y orientados a tareas: navegación clara, filtros, tablas, estados y acciones previsibles.
- Usar iconos Lucide cuando exista un icono conocido; incluir `aria-label` o tooltip en controles cuyo significado no sea evidente.
- Usar botones con icono para herramientas y acciones compactas; no convertir cada control en una píldora textual.
- Mantener radios de hasta `8px` para superficies operativas. Reservar formas más redondeadas para badges, indicadores y controles que ya usen ese patrón.
- Mostrar claramente estados de carga, vacío, error, éxito, deshabilitado y foco de teclado.
- Añadir movimiento con moderación: entrada escalonada o transición breve para cambios de estado, sin animaciones que distraigan del flujo de reservas.

## Responsive y accesibilidad

- Diseñar primero para móvil y comprobar después escritorio. Las grillas deben colapsar sin solapamientos.
- Mantener dimensiones estables para botones, tablas, tarjetas, filas y celdas de disponibilidad.
- Verificar que textos largos, nombres de disciplinas y mensajes de validación puedan envolver sin cortar controles.
- Mantener foco visible, navegación por teclado y contraste WCAG AA para texto normal.
- No ocultar información esencial solo porque cambia el viewport.

## Procedimiento para cada cambio

1. Identificar el componente o token semántico existente antes de añadir estilos nuevos.
2. Reutilizar clases y variables del design system; evitar colores hexadecimales aislados en JSX/TSX.
3. Confirmar que la decisión sirve al flujo funcional del Club Deportivo y no introduce copy o marca de otro producto.
4. Revisar estados normal, hover, focus, disabled, loading, vacío y error.
5. Comprobar móvil y escritorio, y ejecutar lint o build del frontend cuando el entorno lo permita.

## Restricciones

- No usar nombres, claims, copys ni logotipos de marcas externas como parte del producto.
- No transformar una pantalla operativa en una landing de marketing.
- No usar orbes, bokeh u ornamentos grandes que compitan con disponibilidad, reservas o métricas; la única excepción es la nebulosa Acid Lime sutil y de baja opacidad definida para la pantalla general.
- No inventar nuevos colores de estado: actualizar primero `docs/colores.md` si aparece una necesidad funcional nueva.

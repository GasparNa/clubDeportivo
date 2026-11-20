---
name: armar-descripcion-pr
description: Usar para generar la descripción de un pull request a partir del diff contra main y el tasks.md del change activo.
---

# Armar descripción de PR

## Objetivo
Generar una descripción de pull request clara, completa y alineada con el trabajo realizado, basada en evidencia del repositorio.

## Cuándo usarla
- Al preparar un PR desde una rama de feature/fix.
- Al actualizar la descripción de un PR tras nuevos commits.
- Cuando se necesita resumir alcance, pruebas y estado de tareas del change activo.

## Entradas y fuentes
- Diff de la rama: `git diff main...HEAD` (y `git log main...HEAD --oneline` si ayuda al resumen).
- `tasks.md` del change activo en `openspec/changes/<change>/tasks.md` (identificar el change relevante; si hay varios, usar el indicado por la rama/contexto).
- Contexto adicional del change (`proposal.md`, `design.md`) solo si es necesario para precisar la consigna o el alcance.

## Pasos
1. Inspeccionar `git diff main...HEAD` para entender archivos, módulos y comportamiento afectado.
2. Leer el `tasks.md` del change activo y reflejar qué tareas se completaron, cuáles quedan pendientes y cuáles son manuales/externas.
3. Redactar la descripción usando **exactamente** las secciones de la plantilla indicada abajo.
4. Incluir en **Cómo probarlo** pasos reproducibles y comandos relevantes (lint, typecheck, tests, validaciones) acordes a lo cambiado; no inventar resultados ni salidas.
5. Completar **Autorrevisión** y el **checklist** según el estado real del diff/tareas.
6. En **Uso de IA**, declarar de forma transparente si se usó asistencia de IA y para qué (p. ej. redacción, generación de código/configuración), sin inventar detalles.
7. Cerrar la descripción con la línea de atribución que pida el entorno actual (por ejemplo, una línea de coautoría o atribución requerida); si el entorno no especifica una, omitirla y señalarlo.

## Plantilla de salida
Usar estas secciones y este orden:

## Consigna
- Objetivo del cambio y referencia al change/tarea/issue correspondiente.

## Qué hace este cambio
- Resumen de los cambios realizados (qué se agregó/modificó/eliminó y por qué), basado en `git diff main...HEAD` y `tasks.md`.

## Cómo probarlo
- Pasos concretos para verificar el cambio.
- Comandos ejecutados o recomendados y resultados esperados; indicar explícitamente lo que queda como verificación manual.

## Autorrevisión
- Alcance revisado, consistencia con `tasks.md`, ausencia de cambios no relacionados, secretos y encoding verificados (según corresponda).

## Uso de IA
- Declaración del uso de herramientas de IA en la tarea (si aplica) y alcance de esa asistencia.

## Checklist
- [ ] El alcance coincide con el `tasks.md` del change activo
- [ ] Pruebas/validaciones relevantes ejecutadas o justificadas
- [ ] Sin secretos ni credenciales en el diff
- [ ] Sin cambios no relacionados / sin ruido innecesario
- [ ] Documentación actualizada si corresponde

`<línea de atribución requerida por el entorno, si aplica>`
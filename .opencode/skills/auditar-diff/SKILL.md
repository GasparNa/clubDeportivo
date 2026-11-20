---
name: auditar-diff
description: Usar para auditar un diff antes de commitear y detectar problemas de calidad, seguridad y trazabilidad.
---

# Auditar diff antes de commitear

## Objetivo
Revisar los cambios pendientes o staged antes de un commit para identificar riesgos, inconsistencias y tareas faltantes, y entregar un informe claro con hallazgos accionables.

## Cuándo usarla
- Antes de crear un commit.
- Antes de abrir o actualizar un PR.
- Cuando se quiera validar que el diff coincide con el `tasks.md` del change activo y con los escenarios del spec.

## Entradas
- Diff a auditar: `git diff`, `git diff --staged` o `git diff main...HEAD` según corresponda.
- `tasks.md` del change activo en `openspec/changes/<change>/tasks.md` (si aplica).
- Specs/escenarios relacionados en `openspec/changes/<change>/` u `openspec/specs/` (si aplica).

## Checklist de auditoría
1. **Codificación y caracteres**
   - Archivos de texto en UTF-8 sin BOM.
   - Sin caracteres corruptos/mojibake ni reemplazos inesperados.
2. **Alcance y ruido**
   - Sin cambios no relacionados con la tarea.
   - Revisar `pnpm-lock.yaml`: solo debe cambiar si hubo cambios reales de dependencias; si no, tratar como ruido.
   - Sin archivos temporales, generados accidentalmente o modificaciones ajenas.
3. **Secretos y datos sensibles**
   - Sin secretos, tokens, claves privadas, contraseñas ni cadenas de conexión con credenciales hardcodeadas.
   - Sin URLs internas sensibles expuestas innecesariamente.
4. **Reglas de negocio y seguridad (fail-closed)**
   - Sin sesión/autenticación requerida, la operación debe rechazarse (no permitir por defecto).
   - Un socio/usuario solo puede actuar sobre sus propios recursos/datos; verificar controles de autorización.
   - No relajar validaciones ni defaults inseguros.
5. **Pruebas y cobertura de escenarios**
   - Debe existir al menos **una prueba por cada escenario del spec** afectado por el change.
   - Si falta una prueba para algún escenario, registrarlo como hallazgo.
6. **Trazabilidad con tareas**
   - Verificar coincidencia entre `tasks.md` y lo realmente cambiado: tareas marcadas/completadas reflejan el diff, y el diff no incluye trabajo no contemplado sin explicación.
7. **Calidad general**
   - Cambios mínimos y coherentes; sin código muerto o debug accidental.
   - Mensajes/formatos y convenciones del repositorio respetados.

## Formato de salida del informe
Entregar un informe con:
- **Resumen**: alcance auditado (diff/comandos usados) y conclusión general.
- **Hallazgos** (uno por ítem; si no hay, indicar "Sin hallazgos"):
  - **Hallazgo:** descripción breve
  - **Archivo:** ruta (y línea/contexto si aplica)
  - **Gravedad:** Alta | Media | Baja
  - **Qué corregir:** acción concreta y verificable
- **Verificaciones realizadas**: checklist cubierto, pruebas/escenarios contrastados y estado de `tasks.md`.
- **Limitaciones**: cualquier aspecto no verificable con la información disponible.
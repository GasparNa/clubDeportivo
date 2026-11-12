# G1 — Sincronizar OpenSpec (`feature/sync-openspec`)

> Base: `main` @ `c82392a`. Estado verificado: `openspec validate --all --strict` pasa (10/10), pero `openspec/specs/` está vacío y no hay nada archivado.
> Objetivo: que `openspec/specs/` refleje el sistema real y que la IA reciba contexto desde `openspec/config.yaml`.

## 1. Hallazgo que hay que resolver con el equipo

`restrict-reservations-to-active-users` (20/20, ya implementado: el trigger `fn_validar_reserva` con `v_estado_usuario` está en `0001_baseline`) **elimina las reservas para invitados sin cuenta**. Pero:

- `README.md` (líneas 12, 14, 83) y `AGENTS.md` (línea 60) todavía dicen que un invitado puede tener reservas.
- El spec `gestion-reservas-turnos` de `club-deportivo-reservas` define el XOR "Socio o No Socio".
- El delta de `restrict-...` usa `## REMOVED` sobre el requisito "Reservas para invitados sin cuenta", que **no existe en ningún spec**. Al archivar, OpenSpec probablemente falle o ignore ese bloque.

**Decisión a confirmar con tu compañero:** ¿la regla vigente es "solo usuarios ACTIVOS reservan"? Si sí (es lo que implementa la base de datos):

1. En `restrict-reservations-to-active-users`, borrar el bloque `## REMOVED` y agregar `specs/gestion-reservas-turnos/spec.md` con un `## MODIFIED Requirements` sobre "Validación XOR de propietario de reserva" (la reserva pertenece a un usuario ACTIVO).
2. Actualizar README y AGENTS (esto es parte de G2, pero anotalo acá).

El `config.yaml` ya asume esta regla y la marca como `[CONFIRMAR]`.

## 2. Qué hacer con cada change

| Change | Estado real | Acción | ¿Sincroniza specs? |
|---|---|---|---|
| `sports-club-reservation-api` | 0/31. Mismas 4 capabilities que `club-deportivo-reservas`, con menos requisitos: es una versión vieja | `git rm -r` | — |
| `api-reservas` | Vacío, usa `skip_specs` como parche | `git rm -r` | — |
| `club-deportivo-reservas` | 92/106 | Tildar 3.11–3.15 (los cubre `cancelacion-autogestionada`); tachar 2.5 (el esquema es Prisma); pasar 5.1–5.3 y 5.5–5.8 a changes nuevos (tests, E2E, CI); 5.4 se cumple al validar. Archivar **primero** | Sí |
| `cancelacion-autogestionada` | El código y 4 tests existen (`DELETE /reservations/:id`, `cancelarReservaAutogestionada`) | Verificar (comandos abajo), tildar y archivar **después** del grande | Sí |
| `restrict-reservations-to-active-users` | 20/20 | Corregir el delta (sección 1) y archivar | Sí |
| `identidad-visual-logo` | Completo | Archivar | Sí |
| `fix-build-frontend-suspense` | 14/17; faltan 5.1–5.3 (Vercel) | Marcar 5.x como obsoletas (ya no se despliega en Vercel), comprobar `/login` y `/availability` en producción, archivar | Sí |
| `fix-disciplinas-contador-canchas` | 16/19; faltan 5.1–5.3 (Vercel) | Igual que el anterior | Sí |
| `despliegue-backend` | 19/26; la sección 6 es de Render/Vercel | Marcar la sección 6 como obsoleta. Los requisitos de salud, CORS y escucha siguen valiendo | Sí |
| `despliegue-aws` | 24/32; Terraform/App Runner sin aplicar | Archivar **sin sincronizar** para que Terraform y OIDC no queden como "verdad" del sistema. Confirmar la opción con `pnpm exec openspec archive --help` | No |

Convención para tareas obsoletas: `- [x] 5.1 ~~Mergear el PR y esperar el redeploy de Vercel~~ (obsoleta: se despliega en la EC2)`.

Los changes `fix-*` los pude comparar solo por sus tasks y specs: antes de tildar, verificá que el arreglo está en el código.

## 3. Orden de ejecución

1. Copiar `config.yaml` a `openspec/config.yaml` (conserva la clave `githubCopilot` que ya estaba).
2. Crear el change de mantenimiento (ver el prompt de la sección 4).
3. Borrar `sports-club-reservation-api` y `api-reservas`.
4. Verificar `cancelacion-autogestionada`:
   ```bash
   pnpm --filter club-deportivo-backend exec jest reservas --runInBand
   pnpm --filter club-deportivo-backend run lint
   pnpm --filter club-deportivo-backend run typecheck
   ```
5. Ajustar tasks y deltas según la tabla.
6. Archivar en este orden: `club-deportivo-reservas` → `cancelacion-autogestionada` → `restrict-reservations-to-active-users` → `identidad-visual-logo` → `fix-build-frontend-suspense` → `fix-disciplinas-contador-canchas` → `despliegue-backend` → `despliegue-aws` (sin sync).
7. Validar y comprobar el resultado:
   ```bash
   pnpm exec openspec validate --all --strict
   pnpm exec openspec list
   ls openspec/specs
   ```
8. Commit, push y PR contra `main`. El PR debe aprobarlo tu compañero.

Si un archive falla por un conflicto de deltas, no lo fuerces: pegá el error en el chat.

## 4. Prompt para OpenCode (`/opsx-propose`)

```text
/opsx-propose sync-openspec

Contexto: el repo tiene 10 changes de OpenSpec en openspec/changes/ y openspec/specs/ está vacío.
Este change es de mantenimiento y no altera comportamiento: usar skip_specs en .openspec.yaml.

Quiero:
1. Dejar el openspec/config.yaml que ya está en el repo (no lo reescribas).
2. Eliminar los changes sports-club-reservation-api y api-reservas.
3. Reconciliar las tasks de los changes restantes según la tabla de docs/G1-sync-openspec.md.
4. Archivar los changes en el orden indicado en ese documento, sincronizando specs excepto en despliegue-aws.

Generá proposal.md, design.md y tasks.md. NO ejecutes /opsx-apply: me detengo a revisar los artefactos primero.
Cada tarea debe terminar con un comando de verificación (por ejemplo `openspec validate --all --strict`).
```

Antes del apply, revisá que el `tasks.md` generado: (a) no toque código de `backend/` ni `frontend/`, (b) respete el orden de archivado y (c) tenga una tarea final de PR.

## 5. Criterios de aceptación

- [ ] `openspec/specs/` contiene las capabilities sincronizadas (usuarios, instalaciones, reservas, pagos, frontend, branding, despliegue).
- [ ] `openspec list` solo muestra changes realmente abiertos (este mismo y los nuevos).
- [ ] `openspec validate --all --strict` pasa.
- [ ] `openspec/config.yaml` tiene `context` y `rules`.
- [ ] Ninguna task obsoleta queda abierta sin marcar.
- [ ] README/AGENTS no contradicen la regla de invitados (o queda anotado para G2).

## 6. Entrada de bitácora (plantilla)

```markdown
### G1 — Sincronizar OpenSpec
- Fecha / rama / PR:
- Qué pedí a la IA:
- Qué generó OpenCode y qué corregí (por ejemplo: el REMOVED que apuntaba a un requisito inexistente):
- Decisiones tomadas con el equipo (regla de invitados):
- Qué descarté y por qué (despliegue-aws sin sincronizar):
- Resultado: specs sincronizadas, validate pasa.
```
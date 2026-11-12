## 1. Preparación y salvaguardas

- [x] 1.1 Crear la rama `feature/sync-openspec` desde `main` actualizado y confirmar que el working tree solo trae cambios de este mantenimiento — **Verificar**: `git branch --show-current` devuelve `feature/sync-openspec`
- [x] 1.2 Confirmar que `openspec/config.yaml` conserva `context`, `rules` y `githubCopilot` sin reescribirlo — **Verificar**: `Select-String -Path openspec/config.yaml -Pattern '^context:','^rules:','^githubCopilot:'` devuelve 3 coincidencias
- [x] 1.3 Ejecutar la línea base antes de tocar nada — **Verificar**: `pnpm exec openspec validate --all --strict` pasa sin errores

## 2. Baja de changes obsoletos

- [x] 2.1 Eliminar el change viejo `sports-club-reservation-api` con `git rm -r openspec/changes/sports-club-reservation-api` — **Verificar**: `Test-Path openspec/changes/sports-club-reservation-api` devuelve `False`
- [x] 2.2 Eliminar el scaffolding vacío `api-reservas` con `git rm -r openspec/changes/api-reservas` — **Verificar**: `Test-Path openspec/changes/api-reservas` devuelve `False` y `pnpm exec openspec list` no los muestra
- [x] 2.3 Validar el estado tras las bajas — **Verificar**: `pnpm exec openspec validate --all --strict` pasa sin errores

## 3. Verificación de `cancelacion-autogestionada` (sin editar código)

- [x] 3.1 Correr los tests de reservas que cubren la cancelación autogestionada (`DELETE /reservations/:id`, `cancelarReservaAutogestionada`) — **Verificar**: `pnpm --filter club-deportivo-backend exec jest reservas --runInBand` pasa en verde
- [x] 3.2 Correr lint del backend — **Verificar**: `pnpm --filter club-deportivo-backend run lint` sin errores
- [x] 3.3 Correr typecheck del backend — **Verificar**: `pnpm --filter club-deportivo-backend run typecheck` sin errores
- [x] 3.4 Tildar 1.1–5.1 en `openspec/changes/cancelacion-autogestionada/tasks.md` con la evidencia de 3.1–3.3 (1.1 se cumple con `openspec status`; 5.1 se cumple con el PR de este change) — **Verificar**: `Select-String -Path openspec/changes/cancelacion-autogestionada/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias

## 4. Reconciliación de tasks y deltas

- [x] 4.1 En `club-deportivo-reservas/tasks.md`: tachar 2.5 como obsoleta ("el esquema autoritativo es Prisma"), tildar 3.11–3.15 con nota "cubierta por `cancelacion-autogestionada`", tildar 5.4 ("se cumple en la validación final") y tachar 5.1–5.3 y 5.5–5.8 como movidas a `integracion-validacion` — **Verificar**: `Select-String -Path openspec/changes/club-deportivo-reservas/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.2 Crear el change `integracion-validacion` con `proposal.md`, `design.md`, `tasks.md` y `skip_specs: true` (es tooling/tests/CI, no cambia comportamiento), copiando literalmente las tareas 5.1–5.3 y 5.5–5.8 movidas en 4.1 — **Verificar**: `pnpm exec openspec status --change integracion-validacion` reporta los artifacts en `done` y `pnpm exec openspec validate integracion-validacion --strict` pasa
- [x] 4.3 En `restrict-reservations-to-active-users`: borrar el bloque `## REMOVED` sobre "Reservas para invitados sin cuenta", reemplazar `specs/reservas/validacion-usuario-activo/spec.md` por `specs/gestion-reservas-turnos/spec.md` con `## MODIFIED Requirements` de "Validación XOR de propietario de reserva" (usuario ACTIVO) y `## ADDED Requirements` de "Límite de dos reservas confirmadas por usuario activo", y eliminar el directorio viejo — **Verificar**: `Select-String -Path openspec/changes/restrict-reservations-to-active-users/specs/gestion-reservas-turnos/spec.md -Pattern '## REMOVED|invitado'` no devuelve coincidencias y `pnpm exec openspec validate restrict-reservations-to-active-users --strict` pasa
- [x] 4.4 En `fix-build-frontend-suspense/tasks.md`: tachar 5.1–5.3 como obsoletas ("ya no se despliega en Vercel; el deploy vigente es EC2 + Caddy") — **Verificar**: `Select-String -Path openspec/changes/fix-build-frontend-suspense/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.5 En `fix-disciplinas-contador-canchas/tasks.md`: tachar 5.1–5.3 como obsoletas ("ya no se despliega en Vercel; el deploy vigente es EC2 + Caddy") — **Verificar**: `Select-String -Path openspec/changes/fix-disciplinas-contador-canchas/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.6 En `despliegue-backend/tasks.md`: tachar 6.1–6.7 como obsoletas (Render/Vercel reemplazados por EC2 + Caddy), dejando intactos los requisitos de health, CORS y escucha — **Verificar**: `Select-String -Path openspec/changes/despliegue-backend/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.7 En `despliegue-aws/tasks.md`: tachar 4.4 como obsoleta (la actualización de README/AGENTS/`docs/resumen.md` pertenece a G2) y 5.1–5.7 como obsoletas (Terraform/App Runner no aplicado) — **Verificar**: `Select-String -Path openspec/changes/despliegue-aws/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.8 Confirmar que `identidad-visual-logo` no tiene tareas abiertas — **Verificar**: `Select-String -Path openspec/changes/identidad-visual-logo/tasks.md -Pattern '^- \[ \]'` no devuelve coincidencias
- [x] 4.9 Validar todas las reconciliaciones — **Verificar**: `pnpm exec openspec validate --all --strict` pasa sin errores

## 5. Smoke checks de producción (EC2 + Caddy)

- [x] 5.1 Verificar el health del API público — **Verificar**: `curl.exe -fsS https://clubdeportivo.alquilerespunilla.com.ar/api/v1/health` devuelve `200` con `"status":"ok"`
- [x] 5.2 Verificar `/login` y `/availability` en producción (lo que reemplaza las tareas Vercel obsoletas de 4.4 y 4.5) — **Verificar**: `curl.exe -fsS -o NUL -w "%{http_code}" https://clubdeportivo.alquilerespunilla.com.ar/login` y `.../availability` devuelven `200`
- [x] 5.3 Verificar `/disciplines` y `/disciplines/<uuid>` con una disciplina real del API (`/disciplinas` redirige con 307 a la ruta real) — **Verificar**: `curl.exe -fsS https://clubdeportivo.alquilerespunilla.com.ar/api/v1/disciplines` devuelve datos y el GET a `/disciplines/<uuid>` devuelve `200`
- [x] 5.4 Correr el smoke test del repositorio contra el despliegue — **Verificar**: `bash -c "tr -d '\r' < scripts/smoke-test.sh | bash -s -- https://clubdeportivo.alquilerespunilla.com.ar"` termina con `smoke test OK`

## 6. Archivado en orden (validar después de cada uno)

- [x] 6.1 Archivar `club-deportivo-reservas` con sincronización — **Verificar**: `pnpm exec openspec archive club-deportivo-reservas --yes` y `Test-Path openspec/specs/gestion-reservas-turnos/spec.md` devuelve `True`
- [x] 6.2 Archivar `cancelacion-autogestionada` con sincronización — **Verificar**: `pnpm exec openspec archive cancelacion-autogestionada --yes` y `pnpm exec openspec validate --all --strict` pasa
- [x] 6.3 Archivar `restrict-reservations-to-active-users` con sincronización — **Verificar**: `pnpm exec openspec archive restrict-reservations-to-active-users --yes` y el spec `openspec/specs/gestion-reservas-turnos/spec.md` contiene "Validación XOR" con usuario ACTIVO
- [x] 6.4 Archivar `identidad-visual-logo` con sincronización — **Verificar**: `pnpm exec openspec archive identidad-visual-logo --yes` y `Test-Path openspec/specs/frontend-branding/spec.md` devuelve `True`
- [x] 6.5 Archivar `fix-build-frontend-suspense` con sincronización — **Verificar**: `pnpm exec openspec archive fix-build-frontend-suspense --yes` y `Test-Path openspec/specs/frontend-app/spec.md` devuelve `True`
- [x] 6.6 Archivar `fix-disciplinas-contador-canchas` con sincronización — **Verificar**: `pnpm exec openspec archive fix-disciplinas-contador-canchas --yes` y `pnpm exec openspec validate --all --strict` pasa
- [x] 6.7 Archivar `despliegue-backend` con sincronización — **Verificar**: `pnpm exec openspec archive despliegue-backend --yes` y `Test-Path openspec/specs/operacion-despliegue/spec.md` devuelve `True`
- [x] 6.8 Archivar `despliegue-aws` **sin** sincronizar specs — **Verificar**: `pnpm exec openspec archive despliegue-aws --skip-specs --yes` y `Select-String -Path openspec/specs/operacion-despliegue/spec.md -Pattern 'Terraform|App Runner|OIDC'` no devuelve coincidencias

## 7. Validación final y entrega

- [x] 7.1 Validación estricta de todo el repositorio — **Verificar**: `pnpm exec openspec validate --all --strict` pasa sin errores
- [x] 7.2 Confirmar que `openspec list` solo muestra trabajo realmente abierto (`sync-openspec` e `integracion-validacion`) — **Verificar**: `pnpm exec openspec list` lista únicamente esos dos changes
- [x] 7.3 Confirmar las capabilities sincronizadas en `openspec/specs/` (`gestion-usuarios-personas`, `gestion-instalaciones-horarios`, `gestion-reservas-turnos`, `pagos-auditoria-notificaciones`, `frontend-branding`, `frontend-app`, `operacion-despliegue`) — **Verificar**: `Get-ChildItem openspec/specs -Directory | Select-Object -ExpandProperty Name` devuelve las 7
- [x] 7.4 Confirmar que no quedaron tareas obsoletas abiertas en ningún change distinto de `sync-openspec` e `integracion-validacion` — **Verificar**: `Select-String -Path openspec/changes/*/tasks.md -Pattern '^- \[ \]'` solo muestra coincidencias en esos dos archivos
- [x] 7.5 Correr tests del backend (aunque no hubo cambios de código) — **Verificar**: `pnpm --filter club-deportivo-backend run test` pasa en verde
- [x] 7.6 Correr lint y typecheck del backend — **Verificar**: `pnpm --filter club-deportivo-backend run lint` y `pnpm --filter club-deportivo-backend run typecheck` sin errores
- [ ] 7.7 Commit, push y PR contra `main` con el resumen de la sincronización y el link a `docs/G1-sync-openspec.md` — **Verificar**: `gh pr create --base main --head feature/sync-openspec --title "chore(openspec): sincroniza specs y archiva changes"` devuelve la URL del PR
- [ ] 7.8 Esperar CI en verde y 1 aprobación, y hacer squash merge — **Verificar**: `gh pr checks` sin fallos y `gh pr view --json state` devuelve `MERGED`

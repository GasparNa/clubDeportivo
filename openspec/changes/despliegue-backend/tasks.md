## 1. Especificación (API-First)

- [x] 1.1 Crear la change `despliegue-backend` con proposal, delta spec de la capability nueva `operacion-despliegue`, design y tasks, y verificar que `openspec status --change despliegue-backend` reporta los 4 artifacts en `done`
- [x] 1.2 Declarar en la spec los requisitos de health check, CORS por `CORS_ORIGINS` y escucha en `0.0.0.0`

## 2. Backend — CORS y binding

- [x] 2.1 Reemplazar los orígenes CORS hardcodeados por la lista `CORS_ORIGINS` (fallback a `localhost:3000,3001`) en `backend/src/main.ts`
- [x] 2.2 Escuchar en `0.0.0.0` usando `PORT` y loguear los orígenes permitidos al arrancar
- [x] 2.3 Actualizar `backend/.env.example` con `CORS_ORIGINS` y `PORT=3001` (coherente con el fallback del frontend)
- [x] 2.4 Verificar: `nest build` OK y suite de tests en verde (30/30)

## 3. Backend — health check

- [x] 3.1 Crear `backend/src/health/` (controller + module) con `GET /api/v1/health` sin autenticación ni acceso a la BD
- [x] 3.2 Registrar `HealthModule` en `backend/src/app.module.ts`
- [x] 3.3 Verificar: `GET /api/v1/health` devuelve `200 {"status":"ok", ...}` con el servicio real

## 4. Infraestructura y documentación

- [x] 4.1 Crear `render.yaml` (blueprint) con build command, start command, health check path y variables tipadas
- [x] 4.2 Validar localmente la cadena exacta de build de Render (`pnpm install --frozen-lockfile --prod=false` → `prisma:generate` → `build`) y usar `--prod=false` para no perder devDependencies con `NODE_ENV=production`
- [x] 4.3 Crear `docs/despliegue.md` con configuración de Vercel (Root Directory `frontend`), variables por plataforma y checklists de 404 / CORS
- [x] 4.4 Corregir `frontend/.env.local` local a `http://localhost:3001/api/v1` y agregar `PORT` + `CORS_ORIGINS` a `backend/.env` (archivos gitignored, no versionados)

## 5. Verificación end-to-end contra la BD

- [x] 5.1 Confirmar que Prisma conecta al pooler IPv4 de Supabase y que `GET /api/v1/disciplines` devuelve datos (200)
- [x] 5.2 Confirmar CORS: `Origin: https://club-deportivo-phi.vercel.app` → `Access-Control-Allow-Origin` presente; origen desconocido → header ausente
- [x] 5.3 Simular entorno de deploy (`NODE_ENV=production`, `PORT` por env, sin depender del `.env`): el servicio arranca en el puerto inyectado y responde health + datos
- [x] 5.4 Detectar y corregir los textos corruptos en la BD (`U+FFFD` en lugar de `á`/`é`/`ó`/`ú`): 8 valores en `Disciplina.nombre`, `Disciplina.descripcion`, `Cancha.nombre` y `Cancha.superficie`, verificados por hex (`c3a1`/`c3a9`/`c3b3`/`c3ba`, sin `efbfbd`)
- [x] 5.5 Comparar los poolers de Supabase para el deploy y documentar el **session pooler (`:5432`)** como recomendado: el transaction pooler (`:6543`) devolvió `P1001` intermitente en pruebas locales y el session pooler además soporta prepared statements
- [x] 5.6 Probar el flujo completo en local (backend en `:3001` + frontend en `:3000`): páginas 200, CORS correcto y datos con acentos ya legibles

## 6. Pendiente — acciones del equipo (requieren cuentas)

- [ ] 6.1 Mergear la change `despliegue-backend` (PR de `feature/cors-origen-despliegue`)
- [ ] 6.2 Crear el servicio en Render: *New* → *Blueprint* → seleccionar el repositorio
- [ ] 6.3 Cargar en Render `DATABASE_URL` (pooler IPv4 de Supabase) y `CORS_ORIGINS` (`https://club-deportivo-phi.vercel.app`)
- [ ] 6.4 Verificar `GET /api/v1/health` y `GET /api/v1/disciplines` en la URL del servicio de Render
- [ ] 6.5 En Vercel: setear `NEXT_PUBLIC_API_URL` como **Plaintext** con `<url-backend>/api/v1` y redeployar
- [ ] 6.6 Confirmar en Vercel que `Root Directory = frontend` y que el deployment quedó en estado Ready
- [ ] 6.7 Validar el flujo completo desde `https://club-deportivo-phi.vercel.app` (login, disciplinas, reserva)
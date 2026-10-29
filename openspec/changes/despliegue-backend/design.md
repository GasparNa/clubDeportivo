## Context

El frontend (Next.js) está en `https://club-deportivo-phi.vercel.app` y consume el API vía `NEXT_PUBLIC_API_URL` (`frontend/src/lib/http-client.ts:6`, que espera una URL terminada en `/api/v1`). El backend (NestJS + Prisma) solo se ejecutaba local. Al verificar el deploy se comprobó que:

1. El dominio de Vercel respondía **404 en todas las rutas** (`/` y `/login`), con `x-matched-path` vacío: el proyecto no tenía Root Directory apuntando a `frontend`, por lo que Vercel no detectaba el framework Next.js.
2. El backend no estaba desplegado en ninguna plataforma.
3. `backend/src/main.ts` tenía los orígenes CORS hardcodeados a `localhost:3000/3001`, lo que habría bloqueado todas las llamadas del navegador desde el dominio de Vercel.
4. La conexión a Supabase requiere el **pooler en IPv4** (`aws-0-[region].pooler.supabase.com`): el host directo `db.[REF].supabase.co:5432` no resuelve en IPv4 desde este entorno.
5. El cliente Prisma generado no está en el repo: el build de deploy debe ejecutar `prisma generate` explícitamente.
6. La verificación end-to-end local reveló dos problemas de datos/conexión que el deploy no arregla: los textos de `Disciplina` y `Cancha` estaban guardados con el carácter de reemplazo `U+FFFD` en lugar de las vocales acentuadas, y el transaction pooler (`:6543`) falló de forma intermitente con `P1001`.

## Goals / Non-Goals

**Goals:**
- Que el backend pueda desplegarse con un solo clic (blueprint) y quede operativo con la BD.
- Que el frontend desplegado pueda consumir la API (CORS correcto) sin cambios de código.
- Dejar el procedimiento documentado y verificado.

**Non-Goals:**
- No adaptar el backend a serverless de Vercel ni a contenedores (Docker).
- No tocar los contratos de negocio ni el esquema de datos.
- No configurar el CI/CD de GitHub Actions (se maneja en otra change).

## Decisions

- **CORS por lista blanca en env (`CORS_ORIGINS`)**: se prefiere lista explícita sobre comodín `*` porque la API usa `credentials: true` y el navegador no acepta `*` con credenciales.
- **Fallback a localhost**: si la variable no está definida, el comportamiento de desarrollo actual se mantiene (no rompe el trabajo local de los compañeros).
- **Health check sin acceso a la BD**: a propósito, para que responda aunque la base esté caída y sirva de diagnóstico; la conectividad con la BD se verifica aparte con `GET /api/v1/disciplines`.
- **Blueprint de Render**: se eligió Render por ser la opción gratuita y con soporte de procesos Node persistentes que ya nombra el plan del proyecto (Fase 5). El `render.yaml` deja el build/start/health check declarados y solo 2 variables como carga manual.
- **`--prod=false` en el install de deploy**: garantiza que las devDependencies ( nest CLI, Prisma CLI, TypeScript) se instalen aunque la plataforma defina `NODE_ENV=production`, que son necesarias para compilar.
- **`--frozen-lockfile`**: el lockfile raíz está sincronizado (verificado), así que el build falla rápido y de forma determinista si alguien desincroniza dependencias.
- **Session pooler de Supabase (`:5432`) para el deploy**: el backend es un proceso Node de larga duración, así que conviene el modo sesión (soporta prepared statements y mantiene la conexión). Se descartó el transaction pooler (`:6543`) por el `P1001` intermitente observado en las pruebas locales.

## Risks / Trade-offs

- Lista blanca de CORS ⇒ si el frontend cambia de dominio hay que actualizar la variable en la plataforma (y reiniciar). Mitigación: queda documentado en `docs/despliegue.md`.
- Plataforma gratuita con apagado por inactividad ⇒ la primera request puede tardar (~1 min). Riesgo aceptado para el MVP; documentado.
- El health check no valida la BD ⇒ un backend "verde" puede no tener datos. Mitigación: checklist que incluye `GET /api/v1/disciplines`.
- Un `P1001` intermitente en desarrollo puede hacer pensar en un problema de código. Mitigación: documentar en `docs/despliegue.md` que el session pooler (`:5432`) es el recomendado y que el `6543` es solo para conexiones cortas.
- Datos corruptos en la BD no se detectan mirando la consola (la codificación del terminal puede mostrar `?` o `�` indistintamente). Mitigación: verificación por hex (`encode(convert_to(campo,'UTF8'),'hex')`) documentada en `docs/despliegue.md`.

## Migration Plan

1. Merge de la change.
2. Render → *New* → *Blueprint* → seleccionar el repo → cargar `DATABASE_URL` y `CORS_ORIGINS` → deploy.
3. Verificar `GET /api/v1/health` en la URL del servicio.
4. Vercel → setear `NEXT_PUBLIC_API_URL=<url-backend>/api/v1` (Plaintext) → redeploy.
5. Verificar el flujo completo desde `https://club-deportivo-phi.vercel.app`.

Sin migraciones de base de datos: el esquema ya existe en Supabase.

## Open Questions

- ¿Se necesita un plan pago de Render para que el servicio no se apague durante la presentación? Depende de cuándo se demuestra; se deja documentado.
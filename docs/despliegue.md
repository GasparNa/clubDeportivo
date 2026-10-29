# Guía de despliegue (histórica: Render + Vercel + Supabase)

> ⚠️ **Obsoleta para el despliegue objetivo.** El camino vigente es Docker en
> AWS (App Runner + RDS + ECR), documentado en
> [`docs/despliegue-aws.md`](despliegue-aws.md). Esta guía se conserva como
> referencia del despliegue anterior en Render/Vercel/Supabase y para el
> troubleshooting de CORS/datos.

Resumen de cómo desplegar frontend (Vercel) y backend (Node) para que se hablen entre sí.

## 1. Frontend en Vercel

**Configuración del proyecto** (Vercel → Project → Settings → General):

| Setting | Valor |
|---|---|
| Root Directory | `frontend` |
| Framework Preset | Next.js (autodetectado) |
| Install Command | `pnpm install` |
| Build Command | `pnpm build` |
| Output Directory | (auto) `.next` |
| Node.js | 22 |

> Si `Root Directory` queda vacío, Vercel no encuentra `next.config.ts`, no detecta el framework y el dominio responde **404** en todas las rutas.

**Variables de entorno** (Vercel → Project → Settings → Environment Variables):

| Clave | Ejemplo | Tipo | Notas |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://tu-backend.onrender.com/api/v1` | Plaintext | Debe incluir `/api/v1`. El prefijo `NEXT_PUBLIC_` es intencional: el browser necesita la URL del API. Al ser *Plaintext* no aparece el aviso de "secret exposed". |

- No hace falta cargar la URL del propio sitio: Vercel ya expone `VERCEL_URL` y `VERCEL_PROJECT_PRODUCTION_URL`.
- Las variables `NEXT_PUBLIC_*` se **incrustan en el bundle durante el build**: si cambiás el valor hay que **redeployar**, no reiniciar.

## 2. Backend

Plataformas sugeridas: Render, Railway o Fly.io (con Node 20+).

**Camino rápido con Render:** el repo incluye el blueprint [`render.yaml`](../render.yaml). En Render → *New* → *Blueprint* → seleccionar el repositorio, y completar las dos variables `sync: false` (`DATABASE_URL` y `CORS_ORIGINS`). El blueprint ya define build, start y health check.

**Variables de entorno obligatorias:**

| Clave | Notas |
|---|---|
| `DATABASE_URL` | Pooler de Supabase en IPv4. Para despliegues persistentes usar el **session pooler (puerto 5432)**: `postgresql://postgres.[REF]:[PASS]@aws-0-[REGION].pooler.supabase.com:5432/postgres` (el host directo `db.[REF].supabase.co:5432` no resuelve en IPv4). El transaction pooler (`:6543/postgres?pgbouncer=true`) se reserves para conexiones cortas: con el backend como proceso persistente sporadicamente devolvió `P1001 Can't reach database server` |
| `JWT_SECRET` | Mismo valor que en local |
| `JWT_EXPIRATION` | Opcional, ej. `24h` |
| `PORT` | Lo inyecta la plataforma; el backend escucha en `0.0.0.0` |
| `CORS_ORIGINS` | Dominio del frontend, separado por comas: `https://club-deportivo-phi.vercel.app` |
| `SUPABASE_*` | Solo si el backend consume Supabase Auth/Functions |

> `prisma generate` es obligatorio antes de compilar (el cliente generado no viene en el repo): por eso el build command del blueprint lo corre explícitamente.

Build command: `pnpm install --frozen-lockfile --prod=false && pnpm --filter club-deportivo-backend run prisma:generate && pnpm --filter club-deportivo-backend run build`.
Start command: `node backend/dist/main.js`.

> `--prod=false` es necesario si la plataforma define `NODE_ENV=production`: sin él, pnpm omite las devDependencies (nest CLI, Prisma CLI, TypeScript) y no hay forma de compilar.

**Health check:** `GET /api/v1/health` (sin autenticación) devuelve `{ status: 'ok' }` y sirve como health check de la plataforma y para confirmar que el deploy está vivo.

## 3. Checklist cuando el frontend da 404

1. ¿`Root Directory` = `frontend` en Vercel?
2. ¿El build del deployment terminó en **Ready** (tab Deployments)?
3. ¿La variable `NEXT_PUBLIC_API_URL` está cargada en **Production** y se redeployó después de cambiarla?
4. ¿El backend responde? `GET /api/v1/health` debe devolver `200 { "status": "ok" }`; un `GET /api/v1/disciplines` que devuelve datos (y no `404`) confirma además que llegó a Supabase.

## 4. Checklist cuando el frontend carga pero no hay datos

Casi siempre es CORS: el navegador bloquea si el dominio del frontend no está en `CORS_ORIGINS` del backend. Verificar en la consola del navegador (*blocked by CORS policy*) y reiniciar el backend tras cambiar la variable.

Si el navegador los muestra pero con caracteres raros (`B�squetbol`, `F�tbol`), eso **no es el deploy**: son bytes corruptos (carácter Unicode `U+FFFD`) guardados en la base al cargar los datos. Un `console.log` en la terminal puede falsear el diagnóstico según la codificación de la consola; hay que verificar los bytes:

```sql
SELECT nombre, encode(convert_to(nombre, 'UTF8'), 'hex') FROM "Disciplina";
```

`efbfbd` dentro del hex significa que el dato entró roto y hay que corregirlo con un `UPDATE`.

# Sistema de Reservas - Club Deportivo

MVP para una plataforma de reservas de un club deportivo. Desarrollado en equipo bajo un enfoque **API-First**, utilizando **OpenSpec** para la definición del contrato de la API y **CI/CD** con GitHub Actions para validación e integración continua.

## Descripción

El sistema permite la gestión de reservas de canchas por disciplina (Tenis, Fútbol, Pádel), incluye control de aforo por franja horaria, alquiler de equipamiento deportivo, y diferenciación de actores con permisos específicos (Socio, Gerente y Administrador).

### Roles y funciones principales

- **Socio / Usuario Final**: se autoregistra, visualiza agendas libres, reserva y cancela con anticipación, y edita sus datos de contacto.
- **Gerente**: gestiona altas de socios, reservas (socios o no socios), stock y devoluciones de equipamiento, check-in y finalización de turnos en Secretaría.
- **Administrador**: todas las funciones del Gerente, más la gestión completa del catálogo (disciplinas/canchas), alta de personal, reactivación de cuentas suspendidas y auditoría.
- **No Socio (Invitado)**: persona sin cuenta que puede tener una reserva asignada, siempre cargada por Gerencia/Administración.

### Dominios deportivos

- Canchas por disciplina: Tenis, Fútbol, Pádel.
- Franjas horarias y turnos.
- Alquiler de equipamiento deportivo.

## Stack tecnológico

| Capa           | Tecnología             |
|----------------|------------------------|
| Frontend       | Next.js, TypeScript    |
| Backend        | NestJS, TypeScript     |
| Base de datos  | PostgreSQL 16          |
| Especificación | OpenSpec               |
| CI/CD          | GitHub Actions         |
| Infraestructura| Docker + Terraform/AWS |

## Arquitectura

Enfoque **API-First**: el contrato de la API se define desde el inicio mediante **OpenSpec**, y a partir de la especificación se desarrollan backend y frontend. Se prioriza el diseño de arquitectura, el control de versiones colaborativo (Git) y la automatización de la validación y el despliegue (CI/CD).

### Estructura del proyecto

```bash
Ing Software_grupo/
├── backend/                    # API y lógica de negocio (NestJS)
├── frontend/                   # Interfaz de usuario (Next.js)
├── openspec/                   # Especificaciones y changes
├── infra/terraform/            # Infraestructura AWS como código
├── scripts/                    # Utilidades (DB local, smoke test)
├── docs/                       # Documentación adicional
├── .github/
│   └── workflows/              # Pipelines de CI/CD (GitHub Actions)
├── .gitignore
└── README.md
```

## Flujo de trabajo Git

- La rama `main` está protegida: toda integración requiere un Pull Request (PR) con al menos una revisión aprobada por un compañero de equipo.
- Cada nueva especificación o funcionalidad se desarrolla en una rama independiente, por ejemplo:
  - `feature/spec-reserva-vip`
  - `feature/cancelacion-turnos`
  - `feature/check-in-secretaria`

## Integración continua (CI/CD)

Los workflows viven en `.github/workflows/`:

| Workflow | Disparador | Qué hace |
|---|---|---|
| `ci.yml` | Push a `main`/`develop` y PR a `main` | Lint, typecheck, tests, `openspec validate --all --strict`, build de imágenes y validación de compose |
| `docker-build-push.yml` | Push a `main` o manual | Buildx `linux/amd64` → ECR con tags por SHA y `latest` |
| `deploy-aws.yml` | Al terminar el build en `main` o manual | Deploy del backend, smoke test y deploy del frontend en App Runner |

Los jobs de AWS se omiten si no están definidas las variables
`AWS_DEPLOY_ENABLED`, `AWS_ROLE_ARN` y `AWS_REGION`. El CI (lint, tests y
OpenSpec) corre siempre.

## Requisitos funcionales clave

- Consulta de disponibilidad filtrada por disciplina, fecha y franja horaria.
- Creación, consulta y cancelación de reservas con validaciones de negocio (anticipación, no solapamiento, límite de reservas vigentes, stock de equipamiento).
- Check-in y finalización de turno en Secretaría.
- Gestión de stock y devoluciones de equipamiento con control de demoras.
- Auditoría de acciones y trazabilidad de eventos.
- Regla de negocio: toda reserva pertenece exclusivamente a un Socio **o** a un No Socio (exactamente uno de ambos).

## Instrucciones de ejecución

### Backend (NestJS)

```bash
cd backend
pnpm install
pnpm run start:dev
```

### Frontend (Next.js)

```bash
cd frontend
pnpm install
pnpm run dev
```

### Base de datos

El entorno local usa PostgreSQL 16 en Docker (`docker-compose.yml`). El
despliegue objetivo usa **RDS PostgreSQL 16** dentro de una VPC privada. La
configuración de conexión se carga por variables de entorno (`.env`), no
versionadas. Supabase queda como alternativa histórica.

#### PostgreSQL local (Docker)

Requisitos: Docker + Docker Compose.

```bash
cp .env.example .env             # solo la primera vez
cp backend/.env.example backend/.env
pnpm db:up                       # levanta, aplica migraciones y siembra
pnpm db:psql                     # consola psql
pnpm db:seed                     # reaplica el seed (idempotente)
pnpm db:reset                    # borra el volumen y recrea desde cero
```

- Host: `localhost:5433` (dentro de la red Docker: `db:5432`)
- Base y usuario: `club_deportivo` / `club_deportivo`
- Admin de desarrollo: `admin@club.com` / `Admin1234!`
- El esquema se crea con `prisma migrate deploy` (`0001_baseline`); el seed de
  desarrollo vive en `backend/db/seed/20-seed.sql`.

`DATABASE_URL` para el backend:

```dotenv
DATABASE_URL="postgresql://club_deportivo:club_deportivo_dev@localhost:5433/club_deportivo?schema=public"
```

Detalle completo en [`docs/docker.md`](docs/docker.md).

#### Stack completo en contenedores (backend + frontend)

```bash
cp .env.example .env                  # solo la primera vez
docker compose up -d --build          # db + api + web
```

| Servicio | URL | Imagen |
|---|---|---|
| `db` | `localhost:5433` | `postgres:16-alpine` |
| `backend` | `localhost:3001/api/v1` | `backend/Dockerfile` (target `runtime`) |
| `frontend` | `localhost:3000` | `frontend/Dockerfile` (target `runtime`) |

- El backend aplica `prisma migrate deploy` al arrancar (`RUN_MIGRATIONS=true`).
- Para releases conviene usar el target `migrator` como paso separado:
  `docker build -f backend/Dockerfile --target migrator -t club-api:migrator .`
- `NEXT_PUBLIC_API_URL` se hornea en el build del frontend; cambiarla requiere
  rebuild.
- El frontend usa `output: "standalone"`, así que la imagen final no incluye
  `node_modules` de desarrollo.
- `pnpm db:up` sigue levantando **solo** la base local para desarrollo.

Para volver al modo desarrollo (DB en Docker + apps en el host):

```bash
docker compose stop backend frontend
```

## Despliegue en AWS

La infraestructura objetivo (App Runner + RDS + ECR + Terraform) está en
[`infra/terraform/`](infra/terraform/) y se documenta en
[`docs/despliegue-aws.md`](docs/despliegue-aws.md).

> ⚠️ AWS dejó de aceptar clientes nuevos en App Runner (octubre de 2026).
> Verificar el acceso antes de aplicar; la alternativa es ECS Express Mode.

## Contribución

Trabajo grupal colaborativo mediante Pull Requests. Toda funcionalidad debe:

1. Crear una rama independiente desde `main`.
2. Implementar el cambio siguiendo la especificación OpenSpec.
3. Abrir un Pull Request hacia `main`.
4. Obtener al menos una revisión aprobada.
5. Esperar el resultado de la validación de CI/CD antes de integrar.

## Estado del proyecto

MVP con backend, frontend, base de datos local en Docker, tests, CI y
documentación de despliegue. La infraestructura AWS está definida en Terraform,
pendiente de aplicar contra una cuenta real (Fase 0).
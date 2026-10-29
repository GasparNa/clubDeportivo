## Purpose

Permitir operar el backend en entornos desplegados: exponer un endpoint de verificación de salud para las plataformas de hosting y permitir configurar los orígenes CORS (incluido el dominio del frontend en Vercel) mediante variables de entorno, sin modifications de código.

## ADDED Requirements

### Requirement: Verificación de salud del servicio
The system SHALL expose a public endpoint `GET /api/v1/health` that requires no authentication, does not query the database, and returns the service status (`ok`) plus a timestamp, so that hosting platforms and clients can confirm the deployment is alive.

#### Scenario: Health check successful
- **WHEN** a monitoring platform or a client requests `GET /api/v1/health`
- **THEN** the system responds `200` with the service status `ok` and a timestamp

#### Scenario: Health check without credentials
- **WHEN** the health endpoint is requested without any authentication token
- **THEN** the system responds `200` instead of rejecting the request

### Requirement: Configuración de orígenes CORS por entorno
The system SHALL determine the allowed CORS origins from the `CORS_ORIGINS` environment variable (comma-separated list), falling back to `http://localhost:3000,http://localhost:3001` when the variable is not set. The system SHALL only emit the `Access-Control-Allow-Origin` header for origins present in that list.

#### Scenario: Frontend desplegado permitido
- **WHEN** `CORS_ORIGINS` includes the deployed frontend domain and a request arrives with that `Origin` header
- **THEN** the system responds with `Access-Control-Allow-Origin` set to that domain

#### Scenario: Origen no permitido
- **WHEN** a request arrives with an `Origin` that is not in the configured list
- **THEN** the system does not emit the `Access-Control-Allow-Origin` header for that origin

#### Scenario: Variable no definida en desarrollo
- **WHEN** `CORS_ORIGINS` is not defined
- **THEN** the system allows only the local development origins (`http://localhost:3000` and `http://localhost:3001`)

### Requirement: Escucha accesible en plataformas de deploy
The system SHALL listen on host `0.0.0.0` using the port defined by `PORT` (default `3000`), so that the service is reachable from containers and PaaS platforms.

#### Scenario: Puerto definido por la plataforma
- **WHEN** the platform injects `PORT` (e.g. Render) and starts the service
- **THEN** the API is reachable on that port over the network and answers `GET /api/v1/health`
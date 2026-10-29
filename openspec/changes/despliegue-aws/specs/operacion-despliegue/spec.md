## Purpose

Operar el sistema en AWS de forma reproducible: infraestructura declarada en
Terraform, imágenes en ECR, despliegue automatizado sin credenciales de larga
vida, secretos gestionados, dominios propios, migraciones controladas y
observabilidad básica.

## ADDED Requirements

### Requirement: Infraestructura reproducible en Terraform
The system SHALL define its AWS infrastructure (VPC, subredes privadas, security
groups, RDS PostgreSQL, ECR, Secrets Manager, IAM, App Runner, Route53 y alarmas)
as Terraform code under `infra/terraform/`, with remote state in S3 and locking
in DynamoDB, so that a clean environment can be recreated from the repository.

#### Scenario: Apply desde un estado vacío
- **WHEN** un operador ejecuta `terraform init -backend-config=backend.hcl` y `terraform apply` con las imágenes ya publicadas
- **THEN** Terraform crea la VPC, RDS, los repositorios ECR, los secretos, los servicios de App Runner y las alarmas sin pasos manuales

#### Scenario: State remoto bloqueado
- **WHEN** dos ejecuciones de Terraform intentan modificar el state al mismo tiempo
- **THEN** el lock de DynamoDB impide la segunda ejecución hasta que la primera libera el lock

#### Scenario: Destrucción protegida de la base
- **WHEN** se intenta destruir RDS con `db_deletion_protection = true`
- **THEN** AWS rechaza la destrucción hasta que se desactive la protección y se aplique el cambio

### Requirement: Autenticación OIDC sin credenciales de larga vida
The system SHALL authenticate GitHub Actions against AWS using an IAM role
assumed through the GitHub OIDC provider, restricted to the configured repository
and branch, so that no long-lived AWS access keys are stored in GitHub.

#### Scenario: Workflow autorizado
- **WHEN** un workflow del repositorio configurado corre en la rama autorizada
- **THEN** asume el rol de deploy y puede publicar imágenes en ECR e iniciar despliegues en App Runner

#### Scenario: Workflow no autorizado
- **WHEN** un workflow de otro repositorio u otra rama intenta asumir el rol
- **THEN** la condición `sub` del trust policy rechaza la solicitud

### Requirement: Secretos gestionados fuera del repositorio
The system SHALL store the database URL and the JWT signing secret in AWS
Secrets Manager, inject them into the backend at runtime, and keep them out of
the repository and of the frontend bundle.

#### Scenario: Inyección de secretos en el backend
- **WHEN** App Runner inicia una instancia del backend
- **THEN** `DATABASE_URL` y `JWT_SECRET` llegan como variables de entorno sin valores en texto plano en el repositorio

#### Scenario: Rotación manual
- **WHEN** se actualiza el valor de un secreto en Secrets Manager
- **THEN** un nuevo despliegue del servicio toma el valor actualizado sin reconstruir la imagen

#### Scenario: Repositorio sin credenciales
- **WHEN** se audita el repositorio y el historial de git
- **THEN** no hay contraseñas de RDS, cadenas de conexión productivas ni JWT secrets versionados

### Requirement: Publicación de imágenes y despliegue ordenado
The system SHALL build backend and frontend images for `linux/amd64`, publish
them to ECR tagged with the commit SHA and `latest`, and deploy the backend
before the frontend, waiting for a successful operation and running a smoke test
in between.

#### Scenario: Publicación de imágenes
- **WHEN** se ejecuta el workflow de build en `main`
- **THEN** ambas imágenes se publican en ECR con los tags del SHA y `latest`

#### Scenario: Deploy exitoso
- **WHEN** el backend queda `RUNNING` y el smoke test responde health y disciplinas
- **THEN** el workflow inicia el despliegue del frontend y verifica que `/login` responda

#### Scenario: Fallo del backend
- **WHEN** el despliegue del backend falla o el smoke test no responde
- **THEN** el workflow se detiene sin desplegar el frontend

#### Scenario: Deploy deshabilitado
- **WHEN** `AWS_DEPLOY_ENABLED` no es `true` o faltan `AWS_ROLE_ARN`/`AWS_REGION`
- **THEN** los jobs de publicación y deploy se omiten sin marcar el workflow como fallido

### Requirement: Migraciones aplicadas antes de servir tráfico
The system SHALL apply pending Prisma migrations before the backend starts
accepting requests, either through `RUN_MIGRATIONS=true` in the container
entrypoint or through the `migrator` image target, and SHALL be safe to run with
multiple instances.

#### Scenario: Base nueva
- **WHEN** el backend arranca contra una base sin migraciones aplicadas
- **THEN** `prisma migrate deploy` crea el esquema y los triggers antes de que el health check responda

#### Scenario: Varias instancias
- **WHEN** dos instancias del backend arrancan al mismo tiempo con migraciones pendientes
- **THEN** el advisory lock de Prisma serializa la migración y ambas terminan sin errores

### Requirement: Dominios personalizados y CORS coherente
The system SHALL support optional custom domains for backend and frontend in
Route53, manage their TLS certificates through App Runner, and configure the
backend CORS origins to include the frontend public origin.

#### Scenario: Dominio validado
- **WHEN** se configuran `domain_name` y `hosted_zone_id` y se crean los registros de validación
- **THEN** App Runner emite el certificado y sirve el servicio por HTTPS en el subdominio configurado

#### Scenario: CORS del frontend
- **WHEN** el navegador llama al backend desde el origen público del frontend
- **THEN** el backend responde con `Access-Control-Allow-Origin` para ese origen

#### Scenario: Sin dominio propio
- **WHEN** `domain_name` está vacío
- **THEN** los servicios usan las URLs autogeneradas de App Runner y CORS se calcula a partir de la URL del frontend

### Requirement: Observabilidad y rollback
The system SHALL emit CloudWatch alarms for backend/frontend 5xx responses,
backend CPU utilization and external health check failures, notify an optional
SNS email subscription, and allow rolling back by changing the image tag in
Terraform.

#### Scenario: Alarma de errores 5xx
- **WHEN** un servicio supera 10 respuestas 5xx en 5 minutos
- **THEN** la alarma pasa a `ALARM` y notifica al topic SNS configurado

#### Scenario: Health check caído
- **WHEN** el health check HTTPS de Route53 falla 3 veces consecutivas
- **THEN** la alarma de health se dispara y notifica al topic de `us-east-1`

#### Scenario: Rollback declarativo
- **WHEN** se cambia `backend_image_tag` o `web_image_tag` a un SHA anterior y se aplica Terraform
- **THEN** App Runner crea una nueva revisión con esa imagen sin modificar el resto de la infraestructura

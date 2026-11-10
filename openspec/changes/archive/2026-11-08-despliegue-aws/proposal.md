## Why

El proyecto ya tiene Dockerfiles, compose full-stack y hardening de runtime,
pero el despliegue sigue apuntando a Render + Vercel + Supabase. Para el objetivo
del MVP hace falta una infraestructura reproducible en AWS (App Runner + RDS),
con imágenes en ECR, CI/CD sin credenciales de larga vida, secretos gestionados,
dominios propios y observabilidad básica. Sin esto, el despliegue depende de
configuración manual y no hay forma de auditar ni reproducir el entorno.

## What Changes

- **Infraestructura como código** en `infra/terraform/`: VPC con subredes
  privadas, RDS PostgreSQL 16, ECR, Secrets Manager, IAM, App Runner, Route53 y
  alarmas de CloudWatch.
- **State remoto** en S3 con lock en DynamoDB y script de bootstrap.
- **Autenticación OIDC de GitHub Actions** contra AWS, sin access keys.
- **Pipeline de imágenes**: buildx `linux/amd64` a ECR con tags por SHA y
  `latest`.
- **Pipeline de deploy**: `start-deployment` del backend, espera de la operación,
  smoke test y luego deploy del frontend.
- **Smoke test reutilizable** (`scripts/smoke-test.sh`) para health, disciplinas
  y login opcional.
- **Documentación operativa** (`docs/despliegue-aws.md`) y marca de obsoleto
  para `render.yaml` y la guía de Render/Vercel.
- **OpenSpec**: nueva capability de operación de despliegue en AWS.

## Impact

- Capabilities: `operacion-despliegue` (nueva en AWS).
- Infraestructura nueva: cuenta AWS con App Runner (ver aviso de disponibilidad),
  RDS, ECR, Route53, Secrets Manager, CloudWatch y S3/DynamoDB para state.
- CI: `ci.yml` pasa a validar OpenSpec con `--all --strict` y a construir ambas
  imágenes.
- Sin cambios de contrato de negocio ni de esquema de base de datos.

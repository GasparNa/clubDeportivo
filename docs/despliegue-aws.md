# Despliegue en AWS

Guía operativa de la infraestructura definida en `infra/terraform/`: App Runner
para backend y frontend, RDS PostgreSQL 16, ECR, Secrets Manager, Route53 y
CloudWatch. Complementa el plan y las decisiones de [`docs/resumen.md`](resumen.md).

> **Estado:** infraestructura y workflows versionados, pero **sin aplicar**.
> El `terraform apply` real y el primer despliegue quedan pendientes de la Fase 0
> (cuenta AWS, dominio y presupuesto).

---

## 0. Aviso importante sobre App Runner

Desde octubre de 2026 AWS **no acepta clientes nuevos en App Runner**:

> "AWS App Runner is no longer open to new customers. Existing customers can
> continue to use the service as normal."

- Si la cuenta AWS ya usó App Runner, esta guía aplica tal cual.
- Si es una cuenta nueva, el `apply` fallará al crear los servicios. La
  alternativa recomendada por AWS es **ECS Express Mode** (o ECS Fargate con
  ALB). Migrar la capa de cómputo implica reemplazar `apprunner.tf` por
  `ecs.tf` y ajustar los dos workflows de deploy; el resto (VPC, RDS, ECR,
  IAM, secretos, DNS y alarmas) se reutiliza.
- Verificar antes de comprar el dominio o comprometer el presupuesto:
  `aws apprunner list-services --region us-east-1`.

---

## 1. Prerrequisitos (Fase 0)

| Requisito | Detalle |
|---|---|
| Cuenta AWS | Con permisos para VPC, RDS, ECR, IAM, App Runner, Route53, Secrets Manager, CloudWatch y S3/DynamoDB |
| Región | `us-east-1` por defecto (`aws_region`); las métricas de Route53 siempre viven en `us-east-1` |
| Presupuesto | ~USD 45–55/mes con la configuración por defecto (ver §10) |
| Dominio | Opcional pero **muy recomendado**: zona hospedada en Route53 (`domain_name` + `hosted_zone_id`) |
| Terraform | >= 1.6 |
| AWS CLI | v2 autenticada (`aws sts get-caller-identity`) |
| Docker | Para construir y publicar imágenes `linux/amd64` |

### Bootstrap del state remoto (una sola vez)

```bash
./infra/terraform/bootstrap-state.sh us-east-1 club-deportivo-terraform-state club-deportivo-terraform-locks
```

Crea:

- bucket S3 `club-deportivo-terraform-state` con versionado, cifrado AES256 y
  acceso público bloqueado;
- tabla DynamoDB `club-deportivo-terraform-locks` para el lock.

Después:

```bash
cd infra/terraform
cp backend.hcl.example backend.hcl      # ajustar bucket/región si cambió
cp terraform.tfvars.example terraform.tfvars
terraform init -backend-config=backend.hcl
```

`backend.hcl` y `terraform.tfvars` están ignorados por git. El
`.terraform.lock.hcl` **sí** se versiona.

---

## 2. Arquitectura

```text
Route53 (opcional)
  app.<dominio>              api.<dominio>
        │                          │
  App Runner web            App Runner api
   :3000, público            :3001, VPC Connector
        │                          │
        │                    RDS PostgreSQL 16
        │                    privado, :5432, SSL
        │
  ECR (2 repos) ◀── GitHub Actions (OIDC, sin access keys)
  Secrets Manager (database-url, jwt-secret)
  CloudWatch + SNS (5xx, CPU, health check)
```

Decisiones relevantes:

- **Sin NAT Gateway.** App Runner resuelve el pull de ECR, los secretos y los
  logs por su propia red; solo el tráfico de la aplicación pasa por el VPC
  Connector. El backend únicamente habla con RDS.
  Si mañana envía emails por SMTP o llama a una pasarela de pagos, hará falta
  NAT (~USD 32/mes) o un VPC endpoint.
- **Subredes privadas en 2 AZs**, sin subredes públicas.
- **RDS single-AZ** con `deletion_protection = true`, cifrado y
  `rds.force_ssl = 1`.
- **Secretos completos** (`DATABASE_URL` y `JWT_SECRET`) inyectados por App
  Runner con `runtime_environment_secrets`.
- **Migraciones al arrancar** (`RUN_MIGRATIONS=true`). Prisma usa advisory lock,
  así que es seguro con 1–3 instancias. Para releases más controlados existe el
  target `migrator` de `backend/Dockerfile`.

---

## 3. Estructura de `infra/terraform/`

| Archivo | Recursos |
|---|---|
| `versions.tf` | Providers AWS, random, tls y versión mínima |
| `providers.tf` | Provider principal + alias `us_east_1` (métricas de Route53) |
| `backend.tf` / `backend.hcl.example` | State en S3 + lock DynamoDB |
| `variables.tf` / `terraform.tfvars.example` | Variables y valores de ejemplo |
| `locals.tf` | Tags, dominios, endpoints y CORS efectivo |
| `network.tf` | VPC, 2 subredes privadas, route table y security groups |
| `rds.tf` | Subnet group, parameter group (`rds.force_ssl=1`) e instancia |
| `secrets.tf` | `random_password` + secretos `database-url` y `jwt-secret` |
| `ecr.tf` | 2 repositorios, escaneo al push y lifecycle (10 imágenes) |
| `iam.tf` | OIDC de GitHub, rol de deploy, access role e instance role |
| `apprunner.tf` | VPC Connector, auto scaling y 2 servicios |
| `dns.tf` | Asociación de dominios, validación y CNAME en Route53 |
| `observability.tf` | SNS, alarmas 5xx/CPU y health check HTTPS |
| `outputs.tf` | URLs de ECR/servicios, endpoint de RDS, rol de GitHub |
| `bootstrap-state.sh` | Bucket S3 + tabla DynamoDB (una vez) |

---

## 4. Variables principales

| Variable | Default | Notas |
|---|---|---|
| `aws_region` | `us-east-1` | |
| `project_name` | `club-deportivo` | Prefijo de recursos |
| `db_instance_class` | `db.t4g.micro` | |
| `db_deletion_protection` | `true` | En destroy requiere desactivarla primero |
| `db_connection_limit` | `5` | Se inyecta en `DATABASE_URL` |
| `apprunner_min_size` | `1` | Backend siempre encendido |
| `web_min_size` / `web_max_size` | `1` / `3` | App Runner no baja de 1 instancia |
| `domain_name` | `""` | Vacío = URLs autogeneradas de App Runner |
| `hosted_zone_id` | `""` | Obligatorio si `domain_name` no está vacío |
| `github_repository` | `marianalinares-del/club-deportivo` | Condición `sub` del OIDC |
| `github_branch` | `main` | Solo esa rama puede asumir el rol |
| `alarm_email` | `""` | Si se define, suscribe el email a SNS |
| `backend_image_tag` / `web_image_tag` | `latest` | Cambiar a un SHA para rollback |

`create_github_oidc_provider = false` + `github_oidc_provider_arn` permite
reutilizar un provider OIDC que ya exista en la cuenta.

---

## 5. Secuencia de despliegue

### 5.1 Validar

```bash
cd infra/terraform
terraform fmt -check -recursive
terraform validate
```

Sin dominio propio se puede planificar y aplicar directo:

```bash
terraform plan -out=tfplan
terraform apply tfplan
```

Con dominio propio, el primer plan completo falla porque los registros de
validación del certificado todavía no existen (`for_each` sobre valores
desconocidos). Seguir la secuencia de §5.4: primero las asociaciones con
`-target` y después el apply completo.

### 5.2 Primera fase: ECR + rol de GitHub

Los servicios de App Runner necesitan que las imágenes ya existan en ECR. Por
eso el primer apply crea solo los repositorios y el rol OIDC:

```bash
terraform apply \
  -target=aws_ecr_repository.api \
  -target=aws_ecr_repository.web \
  -target=aws_iam_role_policy_attachment.github_deploy
```

Anotar el rol:

```bash
terraform output -raw github_deploy_role_arn
```

### 5.3 Publicar las imágenes

Opción A — desde GitHub Actions (recomendado): configurar las variables de §6 y
ejecutar el workflow **Docker Build & Push** (`workflow_dispatch`).

Opción B — local (requiere Docker buildx si la máquina es ARM):

```bash
REGISTRY=$(terraform output -raw ecr_registry)
aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin "$REGISTRY"

docker buildx build --platform linux/amd64 \
  -f backend/Dockerfile -t "$REGISTRY/club-deportivo-api:latest" --push .
docker buildx build --platform linux/amd64 \
  -f frontend/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL="https://api.<dominio>/api/v1" \
  -t "$REGISTRY/club-deportivo-web:latest" --push .
```

> `NEXT_PUBLIC_API_URL` se hornea en el bundle. Si no hay dominio propio, usar
> primero una URL provisoria y reconstruir el frontend cuando exista la URL del
> backend. Por eso se recomienda configurar el dominio desde el día 1.

### 5.4 Segunda fase: servicios y base de datos

Sin dominio propio:

```bash
terraform apply
```

Con dominio propio, primero se crean las asociaciones (devuelven los registros
de validación) y después el resto:

```bash
terraform apply \
  -target=aws_apprunner_custom_domain_association.api \
  -target=aws_apprunner_custom_domain_association.web

terraform apply
```

El segundo apply crea los registros de validación y los CNAME. La validación del
certificado puede tardar unos minutos; App Runner reintenta solo.

### 5.5 Verificar

```bash
terraform output
curl -fsS https://<api>/api/v1/health
./scripts/smoke-test.sh https://<api>
SMOKE_EMAIL=... SMOKE_PASSWORD=... ./scripts/smoke-test.sh https://<api>
```

---

## 6. Configuración de GitHub

### Variables del repositorio (Settings → Secrets and variables → Actions → Variables)

| Variable | Valor |
|---|---|
| `AWS_DEPLOY_ENABLED` | `true` (con cualquier otro valor los workflows de deploy se omiten) |
| `AWS_REGION` | `us-east-1` |
| `AWS_ROLE_ARN` | Salida `github_deploy_role_arn` |
| `NEXT_PUBLIC_API_URL` | `https://api.<dominio>/api/v1` (se usa al construir la imagen del frontend) |

### Secretos (opcionales, solo para el smoke test con login)

| Secreto | Uso |
|---|---|
| `SMOKE_EMAIL` | Usuario de prueba |
| `SMOKE_PASSWORD` | Contraseña del usuario de prueba |

No se guardan credenciales AWS de larga vida: GitHub Actions asume
`github_deploy_role` por OIDC.

---

## 7. CI/CD

| Workflow | Cuándo | Qué hace |
|---|---|---|
| `ci.yml` | Push a `main`/`develop` y PR a `main` | `lint`, `typecheck`, `test`, `openspec validate --all --strict`, build de ambas imágenes y `docker compose config -q` |
| `docker-build-push.yml` | Push a `main` o manual | Buildx `linux/amd64` → ECR, tags `${{ github.sha }}` y `latest` |
| `deploy-aws.yml` | Al terminar `docker-build-push.yml` en `main`, o manual | `start-deployment` backend → esperar `SUCCEEDED` → smoke test → `start-deployment` frontend → `/login` |

`auto_deployments_enabled = false` en Terraform: el orden lo controla el
workflow, no App Runner.

Si `AWS_DEPLOY_ENABLED` no es `true` (o faltan `AWS_ROLE_ARN`/`AWS_REGION`), los
jobs de build/push y deploy se omiten sin fallar. Así el CI puede estar verde
antes de tener AWS configurado.

---

## 8. Migraciones

- El contenedor del backend corre `prisma migrate deploy` antes de arrancar
  cuando `RUN_MIGRATIONS=true` (lo define Terraform).
- Prisma toma un advisory lock; varias instancias no se pisan.
- Alternativa para releases: construir el target `migrator` y ejecutarlo como
  paso previo:

```bash
docker build -f backend/Dockerfile --target migrator -t club-api:migrator .
docker run --rm -e DATABASE_URL="postgresql://..." club-api:migrator
```

---

## 9. Rollback

El servicio usa el tag configurado en Terraform (por defecto `latest`). El
workflow publica además un tag por SHA (`${{ github.sha }}`).

Para volver a una versión anterior:

```hcl
# terraform.tfvars
backend_image_tag = "<sha-anterior>"
web_image_tag     = "<sha-anterior>"
```

```bash
terraform apply
```

App Runner crea una nueva revisión con esa imagen. El workflow de deploy puede
quedar en pausa (`AWS_DEPLOY_ENABLED=false`) hasta estabilizar.

> El workflow **no** cambia el tag por sí solo: solo reinicia el servicio. Un
> `workflow_dispatch` sin cambios vuelve a desplegar el tag vigente.

---

## 10. Costos estimados (us-east-1, precios de referencia)

| Recurso | Estimado mensual |
|---|---|
| RDS `db.t4g.micro` single-AZ + 20 GB gp3 + backups | ~USD 14 |
| App Runner backend (0.25 vCPU / 0.5 GB, 1 instancia) | ~USD 14 |
| App Runner frontend (0.25 vCPU / 0.5 GB, 1 instancia) | ~USD 14 |
| Secrets Manager (2 secretos) | ~USD 1 |
| Route53 (zona + health check) | ~USD 1 |
| ECR, CloudWatch, SNS, transferencia | ~USD 1–3 |
| **Total** | **~USD 45–55** |

Sin NAT Gateway. Si se agrega, sumar ~USD 32 + transferencia.

Para bajar costos: `db_instance_class = "db.t4g.micro"` es el mínimo; no hay
alternativa serverless en RDS PostgreSQL. Se puede bajar la retención de
backups y el almacenamiento, pero el ahorro es marginal.

---

## 11. Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| `terraform apply` falla al crear App Runner | Cuenta nueva sin acceso a App Runner | Ver §0; migrar a ECS Express |
| Servicio en `CREATE_FAILED` / `RUNNING` con health failing | Imagen no existe, puerto incorrecto o health path | Ver logs de App Runner; confirmar `:3001` y `/api/v1/health` |
| Backend responde 500 al consultar la BD | Security group, subred o `sslmode` | Revisar SG `apprunner` → `rds` y que `DATABASE_URL` tenga `sslmode=require` |
| `P1001` al conectar | RDS aún creando o VPC Connector mal asociado | `terraform output rds_endpoint`; esperar `available` |
| Frontend carga pero sin datos | `NEXT_PUBLIC_API_URL` incorrecta o CORS | Rebuild de la imagen; revisar `terraform output cors_origins` |
| CORS bloquea el dominio de App Runner | El frontend llama a una URL distinta a la del `cors_origins` | Alinear `NEXT_PUBLIC_API_URL` con el origen permitido |
| Certificado de dominio en `PENDING_VALIDATION` | Faltan los registros de validación | Completar el segundo `terraform apply`; esperar propagación DNS |
| `terraform destroy` falla en RDS | `deletion_protection = true` | Poner `false` en `terraform.tfvars`, apply, y recién después destroy |
| `openspec validate --all --strict` falla | Change sin deltas | Ver `skip_specs` en `openspec/changes/api-reservas/.openspec.yaml` |

---

## 12. Deuda técnica y límites conocidos

1. **RLS sin policies.** La app conecta como dueño de las tablas, así que RLS
   queda inerte. Ver §5.5 de `docs/resumen.md`.
2. **Retención de logs.** App Runner crea sus log groups; Terraform no puede
   declararlos antes del servicio. Ajustar retención manualmente o con un
   recurso adicional.
3. **Migraciones en el arranque.** Simple para el MVP; un fallo de migración
   deja el servicio unhealthy. La alternativa es CodeBuild dentro de la VPC.
4. **Sin NAT.** Cualquier servicio externo nuevo (SMTP, pagos) requiere NAT o
   VPC endpoint.
5. **Single-AZ.** Aceptable para el MVP; para producción real, `multi_az = true`.
6. **Rotación de secretos.** `random_password` no rota automáticamente. RDS
   rotation con Lambda queda fuera de alcance.
7. **App Runner para clientes nuevos.** Ver §0.

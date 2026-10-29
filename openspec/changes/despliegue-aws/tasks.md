## 1. Especificación

- [x] 1.1 Crear la change `despliegue-aws` con proposal, delta spec de `operacion-despliegue`, design y tasks
- [x] 1.2 Declarar requisitos de infraestructura, OIDC, secretos, pipeline, migraciones, dominios, observabilidad y rollback
- [x] 1.3 Verificar `pnpm exec openspec validate --all --strict`

## 2. Terraform

- [x] 2.1 `versions.tf`, `providers.tf` (incluye alias `us_east_1`) y `backend.tf` con state en S3 + lock DynamoDB
- [x] 2.2 `variables.tf`, `terraform.tfvars.example`, `locals.tf` y `backend.hcl.example`
- [x] 2.3 `network.tf`: VPC, dos subredes privadas, route table y security groups
- [x] 2.4 `rds.tf`: subnet group, parameter group con `rds.force_ssl=1`, instancia single-AZ
- [x] 2.5 `secrets.tf`: `random_password`, `database-url` y `jwt-secret`
- [x] 2.6 `ecr.tf`: dos repositorios, escaneo al push y lifecycle
- [x] 2.7 `iam.tf`: provider OIDC, rol de GitHub, access role e instance role
- [x] 2.8 `apprunner.tf`: VPC Connector, auto scaling y dos servicios con health checks
- [x] 2.9 `dns.tf`: asociación de dominios, validación y CNAME
- [x] 2.10 `observability.tf`: SNS, alarmas 5xx/CPU y health check HTTPS
- [x] 2.11 `outputs.tf` y `bootstrap-state.sh`
- [x] 2.12 `terraform fmt -check -recursive` y `terraform validate` (Terraform 1.9.8 en Docker)

## 3. CI/CD

- [x] 3.1 Reescribir `ci.yml` con lint, typecheck, test, `openspec validate --all --strict`, builds de imágenes y `docker compose config -q`
- [x] 3.2 `docker-build-push.yml` con buildx `linux/amd64`, tags por SHA y `latest`, login a ECR y OIDC
- [x] 3.3 `deploy-aws.yml` con backend → espera → smoke test → frontend → verificación de `/login`
- [x] 3.4 Gate por `AWS_DEPLOY_ENABLED`, `AWS_ROLE_ARN` y `AWS_REGION`
- [x] 3.5 Validar los workflows con actionlint
- [x] 3.6 `scripts/smoke-test.sh` verificado contra el backend local (health, disciplinas y login)

## 4. Documentación

- [x] 4.1 `docs/despliegue-aws.md` con prerrequisitos, bootstrap, secuencia de apply, GitHub, CI/CD, migraciones, rollback, costos y troubleshooting
- [x] 4.2 Marcar `render.yaml` y `docs/despliegue.md` como obsoletos para el despliegue AWS
- [x] 4.3 `frontend/.env.example` y `.gitignore` de Terraform
- [ ] 4.4 Actualizar `README.md`, `AGENTS.md` y `docs/resumen.md`

## 5. Despliegue real (requiere cuenta AWS)

- [ ] 5.1 Confirmar que la cuenta AWS tiene acceso a App Runner (o migrar a ECS Express)
- [ ] 5.2 Ejecutar `bootstrap-state.sh` y `terraform init -backend-config=backend.hcl`
- [ ] 5.3 Aplicar la primera fase (ECR + rol OIDC) y publicar las imágenes
- [ ] 5.4 Configurar `AWS_DEPLOY_ENABLED`, `AWS_ROLE_ARN`, `AWS_REGION` y `NEXT_PUBLIC_API_URL` en GitHub
- [ ] 5.5 Aplicar el resto de la infraestructura y verificar `terraform output`
- [ ] 5.6 Ejecutar el workflow de deploy y el smoke test contra la URL real
- [ ] 5.7 Configurar dominio, alarmas por email y verificar el certificado

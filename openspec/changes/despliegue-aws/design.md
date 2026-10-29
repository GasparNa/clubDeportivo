## Context

El repositorio ya tiene:

- Dockerfiles multi-stage para backend y frontend, con targets `runtime` y
  `migrator` y contexto de build en la raíz del monorepo.
- `docker-compose.yml` con PostgreSQL 16, API y web.
- Hardening de runtime: health con `SELECT 1`, fail-fast de variables
  obligatorias, logs JSON y `connection_limit` configurable.
- Migraciones Prisma (`0001_baseline`) y reglas de negocio en triggers.

Falta la capa de infraestructura y los pipelines que convierten esos artefactos
en un entorno desplegado, reproducible y observable.

## Goals / Non-Goals

**Goals:**

- Provisionar todo el entorno AWS con Terraform y state remoto bloqueado.
- Desplegar backend y frontend como contenedores en App Runner, con RDS privado.
- Publicar imágenes en ECR desde GitHub Actions usando OIDC.
- Gestionar secretos en Secrets Manager e inyectarlos en runtime.
- Validar el deploy con un smoke test antes de desplegar el frontend.
- Documentar la operación, el rollback, los costos y las limitaciones.

**Non-Goals:**

- No migrar la aplicación a ECS/Fargate (ver riesgo de App Runner).
- No implementar RLS policies ni un rol de base de datos restringido.
- No automatizar la rotación de secretos.
- No reemplazar la autenticación JWT ni los contratos de negocio.
- No configurar un WAF, CDN ni multi-región.

## Decisions

- **App Runner en lugar de ECS**: menor superficie operativa (sin ALB, sin
  task definitions, sin cluster) y escalado automático integrado. El costo es
  similar al de ECS Fargate con un servicio mínimo.
  *Riesgo:* AWS dejó de aceptar clientes nuevos en App Runner (octubre de
  2026). Si la cuenta no tiene acceso, la alternativa es ECS Express Mode; la
  VPC, RDS, ECR, IAM, secretos, DNS y alarmas se reutilizan.
- **Dos servicios App Runner separados**: backend y frontend escalan y se
  despliegan de forma independiente. El frontend no usa VPC porque el navegador
  llama directo al API.
- **Sin NAT Gateway**: App Runner resuelve ECR, secretos y logs por su propia
  red; solo el tráfico de la aplicación pasa por el VPC Connector. El backend
  solo necesita RDS. Si aparece un servicio externo (SMTP, pagos) se agrega NAT
  o un VPC endpoint.
- **Subredes privadas en 2 AZs**: requisito de RDS y del VPC Connector. No se
  crean subredes públicas porque nada las usa.
- **RDS single-AZ con deletion protection**: costo mínimo para el MVP. El
  snapshot final y el cifrado quedan habilitados; `multi_az` es un cambio de
  una variable.
- **Secretos completos**: se guarda la `DATABASE_URL` ya armada y el
  `JWT_SECRET` como strings, y App Runner los inyecta con
  `runtime_environment_secrets`. Evita parsear JSON y mantiene el contrato
  actual del backend.
- **Migraciones al arrancar** (`RUN_MIGRATIONS=true`): Prisma usa advisory lock
  y el MVP corre con pocas instancias. El target `migrator` queda disponible
  para un release step más controlado.
- **Tag `latest` por defecto** y tags por SHA publicados: el deploy reinicia el
  servicio con el tag configurado. El rollback se hace cambiando
  `backend_image_tag`/`web_image_tag` y aplicando Terraform, para que el estado
  declarado siga siendo la fuente de verdad.
- **Dominios desde el día 1 (recomendado)**: `NEXT_PUBLIC_API_URL` se hornea en
  el build del frontend; usar la URL autogenerada de App Runner obliga a
  reconstruir la imagen cuando cambia. Con `api.<dominio>` y `app.<dominio>` el
  build es determinista.
- **DNS en dos fases**: los registros de validación del certificado solo se
  conocen después de crear la asociación del dominio. El primer apply usa
  `-target` sobre las asociaciones y el segundo crea los registros.
- **Alarmas**: 5xx por servicio, CPU del backend y health check HTTPS de Route53
  (métrica en `us-east-1`, con provider alias). App Runner crea sus log groups;
  Terraform no puede declararlos antes del servicio.
- **Gate de deploy**: `AWS_DEPLOY_ENABLED`, `AWS_ROLE_ARN` y `AWS_REGION` como
  variables del repo. Sin ellas los workflows de build/push y deploy se omiten
  en lugar de fallar, para que el CI esté verde antes de configurar AWS.

## Risks / Trade-offs

- **App Runner no disponible para cuentas nuevas** → bloqueante de infraestructura.
  Mitigación: verificar acceso antes de aplicar y documentar la migración a ECS
  Express.
- **Costo del state y de RDS** → el presupuesto ronda USD 45–55/mes sin NAT.
  Mitigación: single-AZ, instancia mínima y alarmas de presupuesto en AWS.
- **Migraciones en el arranque** → un fallo deja el servicio unhealthy y puede
  afectar a todas las instancias. Mitigación: advisory lock, tests en CI y
  target `migrator` como alternativa.
- **`latest` como tag desplegado** → el servicio puede saltar versiones si se
  publican varias imágenes. Mitigación: tags por SHA y rollback declarativo con
  Terraform.
- **Sin NAT** → cualquier integración externa futura falla. Mitigación:
  documentado; agregar NAT o VPC endpoint cuando aparezca la necesidad.
- **Secretos en el state** → el state queda en S3 cifrado y con acceso
  restringido. Mitigación: bucket privado, versionado y lock en DynamoDB.

## Migration Plan

1. Verificar acceso a App Runner en la cuenta AWS.
2. Ejecutar `bootstrap-state.sh` y configurar `backend.hcl`.
3. Aplicar la primera fase (ECR + rol OIDC) y publicar las imágenes.
4. Aplicar el resto de la infraestructura (servicios, RDS, secretos, alarmas).
5. Configurar las variables de GitHub y ejecutar el deploy.
6. Verificar health, disciplinas y login con `scripts/smoke-test.sh`.
7. Marcar `render.yaml` y `docs/despliegue.md` como obsoletos (hecho).

Sin migraciones de esquema: la baseline se aplica al arrancar el contenedor.

## Open Questions

- ¿La cuenta AWS objetivo ya tiene acceso a App Runner? Si no, ¿se migra a ECS
  Express en esta misma change o en una change aparte?
- ¿Se compra el dominio antes del primer despliegue? Sin dominio, el primer
  build del frontend necesita una URL provisoria y un rebuild posterior.
- ¿Se habilita `multi_az` para la entrega final o se acepta single-AZ?

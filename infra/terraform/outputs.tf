# =====================================================================
# Outputs
# =====================================================================

output "aws_account_id" {
  description = "Cuenta de AWS donde se aplicó la infraestructura."
  value       = data.aws_caller_identity.actual.account_id
}

output "aws_region" {
  description = "Región de la infraestructura."
  value       = var.aws_region
}

# ---------------------------------------------------------------------
# ECR
# ---------------------------------------------------------------------

output "ecr_api_repository_url" {
  description = "URL del repositorio ECR del backend."
  value       = aws_ecr_repository.api.repository_url
}

output "ecr_web_repository_url" {
  description = "URL del repositorio ECR del frontend."
  value       = aws_ecr_repository.web.repository_url
}

output "ecr_registry" {
  description = "Registry de ECR (para docker login / buildx)."
  value       = split("/", aws_ecr_repository.api.repository_url)[0]
}

# ---------------------------------------------------------------------
# App Runner
# ---------------------------------------------------------------------

output "api_service_url" {
  description = "URL pública del backend en App Runner."
  value       = "https://${aws_apprunner_service.api.service_url}"
}

output "web_service_url" {
  description = "URL pública del frontend en App Runner."
  value       = "https://${aws_apprunner_service.web.service_url}"
}

output "api_custom_domain" {
  description = "Dominio personalizado del backend (null si no se configuró)."
  value       = local.api_domain
}

output "web_custom_domain" {
  description = "Dominio personalizado del frontend (null si no se configuró)."
  value       = local.web_domain
}

output "cors_origins" {
  description = "Valor efectivo de CORS_ORIGINS inyectado en el backend."
  value       = local.cors_origins
}

# ---------------------------------------------------------------------
# Base de datos
# ---------------------------------------------------------------------

output "rds_endpoint" {
  description = "Endpoint host:puerto de RDS."
  value       = aws_db_instance.principal.endpoint
}

output "rds_address" {
  description = "Host de RDS (sin puerto)."
  value       = aws_db_instance.principal.address
}

output "rds_database_name" {
  description = "Nombre de la base de datos."
  value       = aws_db_instance.principal.db_name
}

# ---------------------------------------------------------------------
# Secretos e IAM
# ---------------------------------------------------------------------

output "database_url_secret_arn" {
  description = "ARN del secreto con la DATABASE_URL."
  value       = aws_secretsmanager_secret.database_url.arn
}

output "jwt_secret_arn" {
  description = "ARN del secreto con el JWT_SECRET."
  value       = aws_secretsmanager_secret.jwt_secret.arn
}

output "github_deploy_role_arn" {
  description = "ARN del rol que debe usar GitHub Actions (variable AWS_ROLE_ARN)."
  value       = aws_iam_role.github_deploy.arn
}

output "github_oidc_provider_arn" {
  description = "ARN del provider OIDC de GitHub."
  value       = local.github_oidc_provider_arn
}

# ---------------------------------------------------------------------
# Red y observabilidad
# ---------------------------------------------------------------------

output "vpc_id" {
  description = "ID de la VPC."
  value       = aws_vpc.principal.id
}

output "private_subnet_ids" {
  description = "IDs de las subredes privadas."
  value       = aws_subnet.privada[*].id
}

output "vpc_connector_arn" {
  description = "ARN del VPC Connector de App Runner."
  value       = aws_apprunner_vpc_connector.principal.arn
}

output "alarm_topic_arn" {
  description = "ARN del topic SNS de alarmas."
  value       = aws_sns_topic.alarmas.arn
}

output "health_check_id" {
  description = "ID del health check de Route53."
  value       = aws_route53_health_check.api.id
}

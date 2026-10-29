locals {
  tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  custom_domains_enabled = var.domain_name != ""

  api_domain = local.custom_domains_enabled ? "${var.api_subdomain}.${var.domain_name}" : null
  web_domain = local.custom_domains_enabled ? "${var.web_subdomain}.${var.domain_name}" : null

  # Si no hay dominio propio se usan las URLs públicas de App Runner.
  api_endpoint = (
    local.custom_domains_enabled
    ? "https://${local.api_domain}"
    : "https://${aws_apprunner_service.api.service_url}"
  )

  web_endpoint = (
    local.custom_domains_enabled
    ? "https://${local.web_domain}"
    : "https://${aws_apprunner_service.web.service_url}"
  )

  # Host (sin esquema) para el health check de Route53.
  api_health_fqdn = (
    local.custom_domains_enabled
    ? local.api_domain
    : aws_apprunner_service.api.service_url
  )

  cors_origins = join(",", compact([local.web_endpoint, var.extra_cors_origins]))
}

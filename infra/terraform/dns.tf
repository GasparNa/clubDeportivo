# =====================================================================
# Dominios personalizados en Route53
# =====================================================================
# Solo se crean si `domain_name` y `hosted_zone_id` están configurados.
# App Runner gestiona el certificado TLS; Terraform crea los registros de
# validación que devuelve la asociación y el CNAME hacia el servicio.

resource "aws_apprunner_custom_domain_association" "api" {
  count = local.custom_domains_enabled ? 1 : 0

  domain_name          = local.api_domain
  service_arn          = aws_apprunner_service.api.arn
  enable_www_subdomain = false

  lifecycle {
    precondition {
      condition     = var.hosted_zone_id != ""
      error_message = "hosted_zone_id es obligatorio cuando domain_name no está vacío."
    }
  }
}

resource "aws_apprunner_custom_domain_association" "web" {
  count = local.custom_domains_enabled ? 1 : 0

  domain_name          = local.web_domain
  service_arn          = aws_apprunner_service.web.arn
  enable_www_subdomain = false

  lifecycle {
    precondition {
      condition     = var.hosted_zone_id != ""
      error_message = "hosted_zone_id es obligatorio cuando domain_name no está vacío."
    }
  }
}

# Registros de validación del certificado (normalmente CNAME).
# Ojo: `certificate_validation_records` solo se conoce después de crear la
# asociación. Por eso el primer apply de un dominio nuevo se hace con
#   terraform apply -target=aws_apprunner_custom_domain_association.api \
#                   -target=aws_apprunner_custom_domain_association.web
# y el segundo apply crea estos registros (ver docs/despliegue-aws.md).
locals {
  api_validacion = local.custom_domains_enabled ? {
    for registro in aws_apprunner_custom_domain_association.api[0].certificate_validation_records :
    "${registro.type}-${registro.name}-${registro.value}" => registro
  } : {}
  web_validacion = local.custom_domains_enabled ? {
    for registro in aws_apprunner_custom_domain_association.web[0].certificate_validation_records :
    "${registro.type}-${registro.name}-${registro.value}" => registro
  } : {}
}

resource "aws_route53_record" "api_validacion" {
  for_each = local.api_validacion

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.value]
  allow_overwrite = true
}

resource "aws_route53_record" "web_validacion" {
  for_each = local.web_validacion

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  ttl             = 300
  records         = [each.value.value]
  allow_overwrite = true
}

resource "aws_route53_record" "api" {
  count = local.custom_domains_enabled ? 1 : 0

  zone_id         = var.hosted_zone_id
  name            = local.api_domain
  type            = "CNAME"
  ttl             = 300
  records         = [aws_apprunner_custom_domain_association.api[0].dns_target]
  allow_overwrite = true
}

resource "aws_route53_record" "web" {
  count = local.custom_domains_enabled ? 1 : 0

  zone_id         = var.hosted_zone_id
  name            = local.web_domain
  type            = "CNAME"
  ttl             = 300
  records         = [aws_apprunner_custom_domain_association.web[0].dns_target]
  allow_overwrite = true
}

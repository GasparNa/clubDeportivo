# =====================================================================
# Observabilidad: SNS, alarmas de CloudWatch y health check
# =====================================================================
# App Runner crea y gestiona sus propios log groups
# (`/aws/apprunner/<servicio>/<id>/application`). No se pueden declarar
# antes del servicio, así que la retención se ajusta manualmente o queda
# como deuda técnica documentada.

resource "aws_sns_topic" "alarmas" {
  name = "${var.project_name}-alarmas"

  tags = {
    Name = "${var.project_name}-alarmas"
  }
}

resource "aws_sns_topic_subscription" "alarmas_email" {
  count = var.alarm_email != "" ? 1 : 0

  topic_arn = aws_sns_topic.alarmas.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# Las métricas de Route53 viven en us-east-1; la alarma necesita un topic
# en esa misma región.
resource "aws_sns_topic" "alarmas_us_east_1" {
  provider = aws.us_east_1
  name     = "${var.project_name}-alarmas-us-east-1"

  tags = {
    Name = "${var.project_name}-alarmas-us-east-1"
  }
}

resource "aws_sns_topic_subscription" "alarmas_us_east_1_email" {
  count    = var.alarm_email != "" ? 1 : 0
  provider = aws.us_east_1

  topic_arn = aws_sns_topic.alarmas_us_east_1.arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

# ---------------------------------------------------------------------
# Alarmas de App Runner
# ---------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "api_5xx" {
  alarm_name        = "${var.project_name}-api-5xx"
  alarm_description = "El backend devolvió más de 10 respuestas 5xx en 5 minutos"

  namespace   = "AWS/AppRunner"
  metric_name = "5xxStatusResponses"
  dimensions = {
    ServiceName = aws_apprunner_service.api.service_name
    ServiceId   = aws_apprunner_service.api.service_id
  }

  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alarmas.arn]
  ok_actions    = [aws_sns_topic.alarmas.arn]
}

resource "aws_cloudwatch_metric_alarm" "web_5xx" {
  alarm_name        = "${var.project_name}-web-5xx"
  alarm_description = "El frontend devolvió más de 10 respuestas 5xx en 5 minutos"

  namespace   = "AWS/AppRunner"
  metric_name = "5xxStatusResponses"
  dimensions = {
    ServiceName = aws_apprunner_service.web.service_name
    ServiceId   = aws_apprunner_service.web.service_id
  }

  statistic           = "Sum"
  period              = 300
  evaluation_periods  = 1
  threshold           = 10
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alarmas.arn]
  ok_actions    = [aws_sns_topic.alarmas.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_cpu" {
  alarm_name        = "${var.project_name}-api-cpu"
  alarm_description = "CPU promedio del backend por encima del 80 % durante 10 minutos"

  namespace   = "AWS/AppRunner"
  metric_name = "CPUUtilization"
  dimensions = {
    ServiceName = aws_apprunner_service.api.service_name
    ServiceId   = aws_apprunner_service.api.service_id
  }

  statistic           = "Average"
  period              = 300
  evaluation_periods  = 2
  threshold           = 80
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "notBreaching"

  alarm_actions = [aws_sns_topic.alarmas.arn]
  ok_actions    = [aws_sns_topic.alarmas.arn]
}

# ---------------------------------------------------------------------
# Health check externo (detecta servicios unhealthy o DNS roto)
# ---------------------------------------------------------------------

resource "aws_route53_health_check" "api" {
  fqdn              = local.api_health_fqdn
  port              = 443
  type              = "HTTPS"
  resource_path     = "/api/v1/health"
  request_interval  = 30
  failure_threshold = 3
  enable_sni        = true
  measure_latency   = false

  # Con dominio propio, esperar a que el CNAME exista antes de monitorear.
  depends_on = [aws_route53_record.api]

  tags = {
    Name = "${var.project_name}-api-health"
  }
}

resource "aws_cloudwatch_metric_alarm" "api_health" {
  provider = aws.us_east_1

  alarm_name        = "${var.project_name}-api-health"
  alarm_description = "El health check HTTPS del backend falló 3 veces seguidas"

  namespace   = "AWS/Route53"
  metric_name = "HealthCheckStatus"
  dimensions = {
    HealthCheckId = aws_route53_health_check.api.id
  }

  statistic           = "Minimum"
  period              = 60
  evaluation_periods  = 2
  threshold           = 1
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "breaching"

  alarm_actions = [aws_sns_topic.alarmas_us_east_1.arn]
  ok_actions    = [aws_sns_topic.alarmas_us_east_1.arn]
}

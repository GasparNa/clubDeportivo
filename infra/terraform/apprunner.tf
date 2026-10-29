# =====================================================================
# App Runner: backend y frontend
# =====================================================================
# `auto_deployments_enabled = false` para que el orden lo controle el
# workflow (migraciones → backend → smoke test → frontend).
# El backend usa VPC Connector; el frontend solo necesita salida pública.

resource "aws_apprunner_vpc_connector" "principal" {
  vpc_connector_name = "${var.project_name}-connector"
  subnets            = aws_subnet.privada[*].id
  security_groups    = [aws_security_group.apprunner.id]

  tags = {
    Name = "${var.project_name}-connector"
  }
}

# ---------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------

resource "aws_apprunner_auto_scaling_configuration_version" "api" {
  auto_scaling_configuration_name = "${var.project_name}-api"
  max_concurrency                 = 100
  min_size                        = var.apprunner_min_size
  max_size                        = var.apprunner_max_size

  tags = {
    Name = "${var.project_name}-api"
  }
}

resource "aws_apprunner_service" "api" {
  service_name = "club-deportivo-api"

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.api.repository_url}:${var.backend_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3001"

        runtime_environment_variables = {
          NODE_ENV            = "production"
          PORT                = "3001"
          RUN_MIGRATIONS      = "true"
          JWT_EXPIRATION      = "24h"
          DB_CONNECTION_LIMIT = tostring(var.db_connection_limit)
          CORS_ORIGINS        = local.cors_origins
        }

        runtime_environment_secrets = {
          DATABASE_URL = aws_secretsmanager_secret.database_url.arn
          JWT_SECRET   = aws_secretsmanager_secret.jwt_secret.arn
        }
      }
    }
  }

  instance_configuration {
    cpu               = var.apprunner_cpu
    memory            = var.apprunner_memory
    instance_role_arn = aws_iam_role.apprunner_instance.arn
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/api/v1/health"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.api.arn

  network_configuration {
    egress_configuration {
      egress_type       = "VPC"
      vpc_connector_arn = aws_apprunner_vpc_connector.principal.arn
    }
  }

  # El servicio resuelve los secretos al iniciar: asegurar que las versiones
  # existan antes de crear la primera revisión.
  depends_on = [
    aws_secretsmanager_secret_version.database_url,
    aws_secretsmanager_secret_version.jwt_secret,
  ]

  tags = {
    Name = "club-deportivo-api"
  }
}

# ---------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------

resource "aws_apprunner_auto_scaling_configuration_version" "web" {
  auto_scaling_configuration_name = "${var.project_name}-web"
  max_concurrency                 = 100
  min_size                        = var.web_min_size
  max_size                        = var.web_max_size

  tags = {
    Name = "${var.project_name}-web"
  }
}

resource "aws_apprunner_service" "web" {
  service_name = "club-deportivo-web"

  source_configuration {
    auto_deployments_enabled = false

    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_ecr_access.arn
    }

    image_repository {
      image_identifier      = "${aws_ecr_repository.web.repository_url}:${var.web_image_tag}"
      image_repository_type = "ECR"

      image_configuration {
        port = "3000"

        runtime_environment_variables = {
          NODE_ENV = "production"
          PORT     = "3000"
          HOSTNAME = "0.0.0.0"
        }
      }
    }
  }

  instance_configuration {
    cpu    = var.apprunner_cpu
    memory = var.apprunner_memory
  }

  health_check_configuration {
    protocol            = "HTTP"
    path                = "/login"
    interval            = 10
    timeout             = 5
    healthy_threshold   = 1
    unhealthy_threshold = 5
  }

  auto_scaling_configuration_arn = aws_apprunner_auto_scaling_configuration_version.web.arn

  # Salida pública: no necesita VPC porque solo sirve HTTP y llama al backend
  # desde el navegador (NEXT_PUBLIC_API_URL queda fija en el build).

  tags = {
    Name = "club-deportivo-web"
  }
}

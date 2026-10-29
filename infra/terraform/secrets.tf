# =====================================================================
# Secretos: contraseña de RDS, DATABASE_URL y JWT_SECRET
# =====================================================================
# App Runner inyecta el SecretString completo como valor de la variable
# (`runtime_environment_secrets`), así que el secreto de la URL es texto
# plano y el de JWT también. No hay que parsear JSON.

resource "random_password" "db_password" {
  length  = 32
  special = false # mantiene la URL de conexión libre de escapes
}

resource "random_password" "jwt_secret" {
  length  = 48
  special = false
}

locals {
  database_url = (
    "postgresql://${var.db_username}:${random_password.db_password.result}" +
    "@${aws_db_instance.principal.address}:5432/${var.db_name}" +
    "?schema=public&sslmode=require&connection_limit=${var.db_connection_limit}"
  )
}

resource "aws_secretsmanager_secret" "database_url" {
  name                    = "${var.project_name}/database-url"
  description             = "URL de conexión de Prisma a RDS (sslmode=require)"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = {
    Name = "${var.project_name}/database-url"
  }
}

resource "aws_secretsmanager_secret_version" "database_url" {
  secret_id     = aws_secretsmanager_secret.database_url.id
  secret_string = local.database_url
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name                    = "${var.project_name}/jwt-secret"
  description             = "Secreto de firma de JWT del backend"
  recovery_window_in_days = var.secret_recovery_window_days

  tags = {
    Name = "${var.project_name}/jwt-secret"
  }
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

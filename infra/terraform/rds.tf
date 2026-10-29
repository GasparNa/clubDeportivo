# =====================================================================
# RDS PostgreSQL 16
# =====================================================================

locals {
  # La familia de parameter group usa solo la versión mayor: "16" o "16.4" → "16".
  db_major_version = split(".", var.db_engine_version)[0]
}

resource "aws_db_subnet_group" "principal" {
  name        = "${var.project_name}-db"
  description = "Subredes privadas para RDS"
  subnet_ids  = aws_subnet.privada[*].id

  tags = {
    Name = "${var.project_name}-db"
  }
}

resource "aws_db_parameter_group" "principal" {
  name        = "${var.project_name}-pg${local.db_major_version}"
  family      = "postgres${local.db_major_version}"
  description = "Parámetros de PostgreSQL para ${var.project_name}"

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  tags = {
    Name = "${var.project_name}-pg${local.db_major_version}"
  }
}

# Sufijo único para el snapshot final: evita colisiones si se recrea la BD.
resource "random_id" "snapshot_final" {
  byte_length = 4
}

resource "aws_db_instance" "principal" {
  identifier = "${var.project_name}-db"

  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.db_allocated_storage * 5
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username
  password = random_password.db_password.result

  db_subnet_group_name   = aws_db_subnet_group.principal.name
  parameter_group_name   = aws_db_parameter_group.principal.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  publicly_accessible = false
  multi_az            = false

  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "sun:04:00-sun:05:00"

  auto_minor_version_upgrade = true
  apply_immediately          = false

  deletion_protection = var.db_deletion_protection
  skip_final_snapshot = !var.db_deletion_protection
  final_snapshot_identifier = (
    var.db_deletion_protection
    ? "${var.project_name}-db-final-${random_id.snapshot_final.hex}"
    : null
  )

  copy_tags_to_snapshot        = true
  performance_insights_enabled = false

  tags = {
    Name = "${var.project_name}-db"
  }
}

# =====================================================================
# Red: VPC con dos subredes privadas (sin NAT Gateway)
# =====================================================================
# App Runner llega a RDS a través del VPC Connector. El tráfico de
# plataforma (pull de ECR, secretos y logs) no pasa por la VPC, así que
# no hace falta NAT. Si mañana el backend llama a un servicio externo
# (SMTP, pasarela de pagos) habrá que agregar NAT o un VPC endpoint.

data "aws_availability_zones" "disponibles" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.disponibles.names, 0, 2)

  # /24 dentro del /16: 10.20.0.0/24 y 10.20.1.0/24.
  subredes_privadas = [
    for indice, az in local.azs : {
      az   = az
      cidr = cidrsubnet(var.vpc_cidr, 8, indice)
    }
  ]
}

resource "aws_vpc" "principal" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

resource "aws_subnet" "privada" {
  count = length(local.subredes_privadas)

  vpc_id                  = aws_vpc.principal.id
  cidr_block              = local.subredes_privadas[count.index].cidr
  availability_zone       = local.subredes_privadas[count.index].az
  map_public_ip_on_launch = false

  tags = {
    Name = "${var.project_name}-privada-${count.index + 1}"
    Tier = "privada"
  }
}

# Tabla de rutas solo con la ruta local de la VPC.
resource "aws_route_table" "privada" {
  vpc_id = aws_vpc.principal.id

  tags = {
    Name = "${var.project_name}-privada"
  }
}

resource "aws_route_table_association" "privada" {
  count = length(aws_subnet.privada)

  subnet_id      = aws_subnet.privada[count.index].id
  route_table_id = aws_route_table.privada.id
}

# =====================================================================
# Security groups
# =====================================================================

# Lo usan las ENIs del VPC Connector de App Runner.
resource "aws_security_group" "apprunner" {
  name        = "${var.project_name}-apprunner"
  description = "Salida del VPC Connector de App Runner hacia RDS"
  vpc_id      = aws_vpc.principal.id

  tags = {
    Name = "${var.project_name}-apprunner"
  }
}

resource "aws_vpc_security_group_egress_rule" "apprunner_rds" {
  security_group_id            = aws_security_group.apprunner.id
  description                  = "PostgreSQL hacia RDS"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.rds.id
}

resource "aws_security_group" "rds" {
  name        = "${var.project_name}-rds"
  description = "Acceso a PostgreSQL solo desde el VPC Connector de App Runner"
  vpc_id      = aws_vpc.principal.id

  tags = {
    Name = "${var.project_name}-rds"
  }
}

resource "aws_vpc_security_group_ingress_rule" "rds_desde_apprunner" {
  security_group_id            = aws_security_group.rds.id
  description                  = "PostgreSQL desde App Runner"
  ip_protocol                  = "tcp"
  from_port                    = 5432
  to_port                      = 5432
  referenced_security_group_id = aws_security_group.apprunner.id
}

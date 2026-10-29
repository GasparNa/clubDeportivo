# =====================================================================
# General
# =====================================================================

variable "aws_region" {
  description = "Región de AWS donde se despliega la infraestructura."
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefijo de todos los recursos."
  type        = string
  default     = "club-deportivo"

  validation {
    condition     = can(regex("^[a-z0-9-]+$", var.project_name))
    error_message = "project_name solo puede tener minúsculas, números y guiones."
  }
}

variable "environment" {
  description = "Nombre del entorno."
  type        = string
  default     = "production"
}

# =====================================================================
# Red y base de datos
# =====================================================================

variable "vpc_cidr" {
  description = "CIDR de la VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "db_name" {
  description = "Nombre de la base PostgreSQL."
  type        = string
  default     = "club_deportivo"
}

variable "db_username" {
  description = "Usuario administrador de PostgreSQL."
  type        = string
  default     = "club_deportivo"
}

variable "db_instance_class" {
  description = "Clase de instancia RDS."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Almacenamiento en GB para RDS."
  type        = number
  default     = 20
}

variable "db_engine_version" {
  description = "Versión mayor de PostgreSQL."
  type        = string
  default     = "16"
}

variable "db_deletion_protection" {
  description = "Habilita deletion protection y snapshot final en RDS."
  type        = bool
  default     = true
}

variable "db_connection_limit" {
  description = "connection_limit del pool de Prisma por instancia."
  type        = number
  default     = 5
}

# =====================================================================
# Secretos
# =====================================================================

variable "secret_recovery_window_days" {
  description = "Días que Secrets Manager conserva un secreto borrado (0 = inmediato)."
  type        = number
  default     = 7

  validation {
    condition     = var.secret_recovery_window_days >= 0 && var.secret_recovery_window_days <= 30
    error_message = "secret_recovery_window_days debe estar entre 0 y 30."
  }
}

# =====================================================================
# App Runner
# =====================================================================

variable "backend_image_tag" {
  description = "Tag de la imagen del backend en ECR (latest o un SHA)."
  type        = string
  default     = "latest"
}

variable "web_image_tag" {
  description = "Tag de la imagen del frontend en ECR (latest o un SHA)."
  type        = string
  default     = "latest"
}

variable "apprunner_cpu" {
  description = "CPU por instancia de App Runner."
  type        = string
  default     = "0.25 vCPU"
}

variable "apprunner_memory" {
  description = "Memoria por instancia de App Runner."
  type        = string
  default     = "0.5 GB"
}

variable "apprunner_min_size" {
  description = "Instancias mínimas del backend."
  type        = number
  default     = 1
}

variable "apprunner_max_size" {
  description = "Instancias máximas del backend."
  type        = number
  default     = 3
}

variable "web_min_size" {
  description = "Instancias mínimas del frontend (0 reduce costos con cold start)."
  type        = number
  default     = 1
}

variable "web_max_size" {
  description = "Instancias máximas del frontend."
  type        = number
  default     = 3
}

# =====================================================================
# Dominio y CORS
# =====================================================================

variable "domain_name" {
  description = "Dominio raíz en Route53. Vacío para usar solo las URLs de App Runner."
  type        = string
  default     = ""
}

variable "hosted_zone_id" {
  description = "Hosted zone de Route53 para domain_name."
  type        = string
  default     = ""
}

variable "api_subdomain" {
  description = "Subdominio del backend."
  type        = string
  default     = "api"
}

variable "web_subdomain" {
  description = "Subdominio del frontend."
  type        = string
  default     = "app"
}

variable "extra_cors_origins" {
  description = "Orígenes CORS adicionales separados por coma."
  type        = string
  default     = ""
}

# =====================================================================
# GitHub OIDC
# =====================================================================

variable "github_repository" {
  description = "Repositorio de GitHub que puede asumir el rol de deploy (owner/repo)."
  type        = string
  default     = "marianalinares-del/club-deportivo"
}

variable "github_branch" {
  description = "Rama autorizada para asumir el rol de deploy."
  type        = string
  default     = "main"
}

variable "create_github_oidc_provider" {
  description = "Crear el provider OIDC de GitHub. Poner false si ya existe en la cuenta."
  type        = bool
  default     = true
}

variable "github_oidc_provider_arn" {
  description = "ARN del provider OIDC existente cuando create_github_oidc_provider = false."
  type        = string
  default     = ""
}

# =====================================================================
# Observabilidad
# =====================================================================

variable "alarm_email" {
  description = "Email para recibir alarmas. Vacío para no suscribir."
  type        = string
  default     = ""
}

# =====================================================================
# ECR: un repositorio por servicio
# =====================================================================
# Los nombres deben coincidir con los de `.github/workflows/docker-build-push.yml`
# (variables ECR_API_REPOSITORY y ECR_WEB_REPOSITORY).

resource "aws_ecr_repository" "api" {
  name                 = "club-deportivo-api"
  image_tag_mutability = "MUTABLE" # necesario para mover `latest`
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "club-deportivo-api"
  }
}

resource "aws_ecr_repository" "web" {
  name                 = "club-deportivo-web"
  image_tag_mutability = "MUTABLE"
  force_delete         = false

  image_scanning_configuration {
    scan_on_push = true
  }

  encryption_configuration {
    encryption_type = "AES256"
  }

  tags = {
    Name = "club-deportivo-web"
  }
}

# Conserva las últimas 10 imágenes con tag y descarta las huérfanas.
locals {
  politica_ciclo_vida = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expirar imágenes sin tag después de 7 días"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = { type = "expire" }
      },
      {
        rulePriority = 2
        description  = "Conservar las últimas 10 imágenes con tag"
        selection = {
          tagStatus   = "tagged"
          countType   = "imageCount"
          countNumber = 10
        }
        action = { type = "expire" }
      },
    ]
  })
}

resource "aws_ecr_lifecycle_policy" "api" {
  repository = aws_ecr_repository.api.name
  policy     = local.politica_ciclo_vida
}

resource "aws_ecr_lifecycle_policy" "web" {
  repository = aws_ecr_repository.web.name
  policy     = local.politica_ciclo_vida
}

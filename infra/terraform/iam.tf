# =====================================================================
# IAM
# =====================================================================
# Tres roles:
#   1. GitHub Actions (OIDC)  → push a ECR y start-deployment en App Runner
#   2. App Runner access role → pull de imágenes desde ECR
#   3. App Runner instance    → lectura de secretos desde la aplicación

data "aws_caller_identity" "actual" {}

# ---------------------------------------------------------------------
# 1. GitHub Actions vía OIDC (sin access keys)
# ---------------------------------------------------------------------

resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_github_oidc_provider ? 1 : 0

  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea1",
    "1c58a3a8518e8759bf075b76b750d4f2df264fcd",
  ]

  tags = {
    Name = "${var.project_name}-github-oidc"
  }
}

locals {
  github_oidc_provider_arn = (
    var.create_github_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : var.github_oidc_provider_arn
  )
}

data "aws_iam_policy_document" "github_trust" {
  statement {
    sid     = "GitHubActionsOIDC"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [local.github_oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repository}:ref:refs/heads/${var.github_branch}"]
    }
  }
}

resource "aws_iam_role" "github_deploy" {
  name               = "${var.project_name}-github-deploy"
  description        = "Rol asumido por GitHub Actions para publicar imágenes y desplegar"
  assume_role_policy = data.aws_iam_policy_document.github_trust.json

  lifecycle {
    precondition {
      condition     = local.github_oidc_provider_arn != ""
      error_message = "Definir github_oidc_provider_arn cuando create_github_oidc_provider = false."
    }
  }

  tags = {
    Name = "${var.project_name}-github-deploy"
  }
}

data "aws_iam_policy_document" "github_deploy" {
  statement {
    sid       = "EcrLogin"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPushPull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:BatchGetImage",
      "ecr:CompleteLayerUpload",
      "ecr:GetDownloadUrlForLayer",
      "ecr:InitiateLayerUpload",
      "ecr:PutImage",
      "ecr:UploadLayerPart",
      "ecr:DescribeImages",
    ]
    resources = [
      aws_ecr_repository.api.arn,
      aws_ecr_repository.web.arn,
    ]
  }

  # App Runner no admite permisos a nivel de recurso para list-operations ni
  # para el descubrimiento del servicio, así que el despliegue usa "*".
  statement {
    sid    = "AppRunnerDeploy"
    effect = "Allow"
    actions = [
      "apprunner:ListServices",
      "apprunner:DescribeService",
      "apprunner:ListOperations",
      "apprunner:StartDeployment",
    ]
    resources = ["*"]
  }
}

resource "aws_iam_policy" "github_deploy" {
  name        = "${var.project_name}-github-deploy"
  description = "Publicación de imágenes y despliegue en App Runner"
  policy      = data.aws_iam_policy_document.github_deploy.json

  tags = {
    Name = "${var.project_name}-github-deploy"
  }
}

resource "aws_iam_role_policy_attachment" "github_deploy" {
  role       = aws_iam_role.github_deploy.name
  policy_arn = aws_iam_policy.github_deploy.arn
}

# ---------------------------------------------------------------------
# 2. App Runner: rol de acceso para descargar imágenes de ECR
# ---------------------------------------------------------------------

data "aws_iam_policy_document" "apprunner_ecr_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["build.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_ecr_access" {
  name               = "${var.project_name}-apprunner-ecr"
  description        = "Permite a App Runner descargar imágenes desde ECR"
  assume_role_policy = data.aws_iam_policy_document.apprunner_ecr_trust.json

  tags = {
    Name = "${var.project_name}-apprunner-ecr"
  }
}

resource "aws_iam_role_policy_attachment" "apprunner_ecr_access" {
  role       = aws_iam_role.apprunner_ecr_access.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

# ---------------------------------------------------------------------
# 3. App Runner: rol de instancia para la aplicación
# ---------------------------------------------------------------------

data "aws_iam_policy_document" "apprunner_instance_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["tasks.apprunner.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "apprunner_instance" {
  name               = "${var.project_name}-apprunner-instance"
  description        = "Permite al backend leer sus secretos en runtime"
  assume_role_policy = data.aws_iam_policy_document.apprunner_instance_trust.json

  tags = {
    Name = "${var.project_name}-apprunner-instance"
  }
}

data "aws_iam_policy_document" "apprunner_instance" {
  statement {
    sid    = "LeerSecretos"
    effect = "Allow"
    actions = [
      "secretsmanager:GetSecretValue",
      "secretsmanager:DescribeSecret",
    ]
    resources = [
      aws_secretsmanager_secret.database_url.arn,
      aws_secretsmanager_secret.jwt_secret.arn,
    ]
  }
}

resource "aws_iam_policy" "apprunner_instance" {
  name        = "${var.project_name}-apprunner-instance"
  description = "Lectura de secretos del backend"
  policy      = data.aws_iam_policy_document.apprunner_instance.json

  tags = {
    Name = "${var.project_name}-apprunner-instance"
  }
}

resource "aws_iam_role_policy_attachment" "apprunner_instance" {
  role       = aws_iam_role.apprunner_instance.name
  policy_arn = aws_iam_policy.apprunner_instance.arn
}

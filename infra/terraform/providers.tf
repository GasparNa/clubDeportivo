provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.tags
  }
}

# Las métricas de los health checks de Route53 se publican únicamente en
# us-east-1, sin importar la región del resto de la infraestructura.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = local.tags
  }
}

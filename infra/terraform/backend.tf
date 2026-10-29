# El bucket, la región y la tabla se pasan con `-backend-config`:
#   terraform init -backend-config=backend.hcl
terraform {
  backend "s3" {
    key            = "club-deportivo/terraform.tfstate"
    encrypt        = true
    dynamodb_table = "club-deportivo-terraform-locks"
  }
}

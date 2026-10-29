#!/usr/bin/env bash
# =====================================================================
# Bootstrap del state remoto de Terraform
# =====================================================================
# Crea (una sola vez, por cuenta/región):
#   - bucket S3 con versionado, cifrado y acceso público bloqueado
#   - tabla DynamoDB para el lock
#
# Requisitos: AWS CLI v2 con credenciales que puedan crear S3, DynamoDB y
# (opcional) KMS.
#
# Uso:
#   ./infra/terraform/bootstrap-state.sh [region] [bucket] [tabla]
#
# Después:
#   cp backend.hcl.example backend.hcl   # ajustar bucket/region
#   terraform init -backend-config=backend.hcl
# =====================================================================
set -euo pipefail

REGION="${1:-us-east-1}"
BUCKET="${2:-club-deportivo-terraform-state}"
TABLA="${3:-club-deportivo-terraform-locks}"

command -v aws >/dev/null 2>&1 || {
  echo "❌ Falta AWS CLI v2." >&2
  exit 1
}

echo "→ Región: $REGION"
echo "→ Bucket: $BUCKET"
echo "→ Tabla de locks: $TABLA"

# ---------------------------------------------------------------------
# Bucket S3
# ---------------------------------------------------------------------
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "ℹ️  El bucket ya existe; se reutiliza."
else
  if [ "$REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
  else
    aws s3api create-bucket \
      --bucket "$BUCKET" \
      --region "$REGION" \
      --create-bucket-configuration LocationConstraint="$REGION" >/dev/null
  fi
  echo "✅ Bucket creado."
fi

aws s3api put-bucket-versioning \
  --bucket "$BUCKET" \
  --versioning-configuration Status=Enabled

aws s3api put-bucket-encryption \
  --bucket "$BUCKET" \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"},
      "BucketKeyEnabled": true
    }]
  }'

aws s3api put-public-access-block \
  --bucket "$BUCKET" \
  --public-access-block-configuration \
  'BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true'

echo "✅ Versionado, cifrado y bloqueo de acceso público configurados."

# ---------------------------------------------------------------------
# Tabla DynamoDB
# ---------------------------------------------------------------------
if aws dynamodb describe-table --table-name "$TABLA" --region "$REGION" >/dev/null 2>&1; then
  echo "ℹ️  La tabla ya existe; se reutiliza."
else
  aws dynamodb create-table \
    --table-name "$TABLA" \
    --attribute-definitions AttributeName=LockID,AttributeType=S \
    --key-schema AttributeName=LockID,KeyType=HASH \
    --billing-mode PAY_PER_REQUEST \
    --region "$REGION" >/dev/null

  aws dynamodb wait table-exists --table-name "$TABLA" --region "$REGION"
  echo "✅ Tabla de locks creada."
fi

cat <<EOF

🎉 Bootstrap listo.

Siguientes pasos:
  cd infra/terraform
  cp backend.hcl.example backend.hcl
  # ajustar bucket/region en backend.hcl
  terraform init -backend-config=backend.hcl
  terraform plan -out=tfplan

Recordatorio: habilitar versionado del bucket ayuda a recuperar estados
anteriores, pero el bucket es privado y solo lo usa Terraform.
EOF

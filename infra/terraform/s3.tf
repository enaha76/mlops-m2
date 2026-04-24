resource "random_id" "bucket_suffix" {
  byte_length = 3
}

resource "aws_s3_bucket" "main" {
  bucket = "${var.project_name}-${random_id.bucket_suffix.hex}"
}

resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Lifecycle: expire old non-current versions so we don't pay forever for a school project.
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    id     = "expire-noncurrent"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# Create the logical prefix structure the spec requires.
# S3 doesn't have real "folders" but a 0-byte key is a common convention.
locals {
  prefixes = ["data/raw/", "data/processed/", "mlflow-artifacts/", "dvc-store/"]
}

resource "aws_s3_object" "prefixes" {
  for_each = toset(local.prefixes)
  bucket   = aws_s3_bucket.main.id
  key      = each.value
  content  = ""
}

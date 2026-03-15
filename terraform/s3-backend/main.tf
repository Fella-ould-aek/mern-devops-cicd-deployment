terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}
provider "aws" {
  region = "us-east-1"
}
resource "aws_s3_bucket" "terraform_state" {
  bucket = "todo-app-terraform-state-fella"
  tags = {
    Name = "Terraform State Bucket"
  }
}
resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  versioning_configuration {
    status = "Enabled"
  }
}
resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket                  = aws_s3_bucket.terraform_state.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}
resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}
resource "aws_dynamodb_table" "terraform_state_lock" {
  name         = "todo-app-state-lock"
  billing_mode = "PAY_PER_REQUEST"  # ← only pay per use, no fixed cost
  hash_key     = "LockID"           # ← required by Terraform

  attribute {
    name = "LockID"
    type = "S"                      # ← S means String
  }

  tags = {
    Name = "Terraform State Lock Table"
  }
}
output "state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  value       = aws_s3_bucket.terraform_state.id
}

output "state_bucket_arn" {
  description = "S3 bucket ARN for Terraform state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "backend_config" {
  description = "Backend configuration to use in main Terraform"
  value       = <<-EOT
    backend "s3" {
      bucket  = "${aws_s3_bucket.terraform_state.id}"
      key     = "{{projectName}}-service/terraform.tfstate"
      region  = "${var.aws_region}"
      encrypt = true
    }
  EOT
}

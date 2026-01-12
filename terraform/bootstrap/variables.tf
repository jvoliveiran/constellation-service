variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "{{projectName}}"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "state_bucket_name" {
  description = "S3 bucket name for Terraform state"
  type        = string
  default     = "{{projectName}}-service-tfstate"
}

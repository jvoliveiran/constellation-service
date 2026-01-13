# AWS Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

# Application Configuration
variable "app_image" {
  description = "Docker image for the application (if null, uses latest from ECR)"
  type        = string
  default     = null
}

# Database Configuration
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "{{projectName}}"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "constellation"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Database storage in GB"
  type        = number
  default     = 5
}

# Secrets Configuration (auto-create mode)
variable "app_secrets" {
  description = "Application secrets as JSON string (e.g., '{\"KEY\":\"value\"}')"
  type        = string
  sensitive   = true
  default     = "{}"
}

# Environment Variables
variable "container_environment_vars" {
  description = "Non-sensitive environment variables"
  type        = map(string)
  default = {
    NODE_ENV  = "production"
    LOG_LEVEL = "info"
  }
}

# ECS Deployment Configuration
variable "skip_ecs_deployment" {
  description = "Create ECR repository and infrastructure without deploying ECS service. Useful for bootstrap when no Docker image exists yet. Set to true for initial apply, then false after pushing image to ECR."
  type        = bool
  default     = false
}

# Resource Configuration
variable "task_cpu" {
  description = "CPU units for ECS task (256 = 0.25 vCPU)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory in MB for ECS task"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Number of ECS tasks"
  type        = number
  default     = 2
}

variable "enable_fargate_spot" {
  description = "Enable Fargate Spot for cost savings"
  type        = bool
  default     = true
}

variable "fargate_spot_percentage" {
  description = "Percentage of tasks to run on Fargate Spot (0-100)"
  type        = number
  default     = 50
}

variable "health_check_path" {
  description = "Health check endpoint path"
  type        = string
  default     = "/health"
}
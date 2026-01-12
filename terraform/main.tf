terraform {
  required_version = ">= 1.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket = "{{projectName}}-tfstate"
    key    = "{{projectName}}-service/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
}

module "constellation_service" {
  source = "git::https://github.com/jvoliveiran/constellation-infra.git//modules/web-app?ref=main"

  # Required: Must match shared infrastructure
  project_name = "{{projectName}}"
  environment  = "production"

  # Application configuration
  app_name  = "{{projectName}}-svc"
  app_image = var.app_image

  # Database configuration
  enable_database    = true
  db_name            = var.db_name
  db_username        = var.db_username
  db_password        = var.db_password
  db_instance_class  = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage

  # DNS configuration for api.{{domainName}}
  enable_dns            = true
  domain_name           = "{{domainName}}"
  subdomain             = "api"
  create_https_listener = true

  # Application secrets (auto-create mode)
  secrets_auto_create = jsondecode(var.app_secrets)

  # Environment variables (non-sensitive)
  container_environment_vars = var.container_environment_vars

  # ECS Deployment Configuration
  skip_ecs_deployment = var.skip_ecs_deployment

  # Resource configuration
  task_cpu                 = var.task_cpu
  task_memory              = var.task_memory
  enable_scheduled_scaling = true  # Enables off-hours scaling
  desired_count            = 0
  enable_fargate_spot      = false #var.enable_fargate_spot
  fargate_spot_percentage  = var.fargate_spot_percentage

  health_check_path = var.health_check_path

  # CloudWatch Logs Configuration
  enable_cloudwatch_logs        = false
  cloudwatch_log_retention_days = 3

  tags = {
    Environment = "production"
    Application = "{{projectName}}-service"
    Project     = "constellation"
    ManagedBy   = "terraform"
  }
}

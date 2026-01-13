# ECR Repository
output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = module.constellation_service.ecr_repository_url
}

# ECS Service
output "service_name" {
  description = "ECS service name"
  value       = module.constellation_service.service_name
}

output "task_definition_arn" {
  description = "ECS task definition ARN"
  value       = module.constellation_service.task_definition_arn
}

# Load Balancer
output "target_group_arn" {
  description = "ALB target group ARN"
  value       = module.constellation_service.target_group_arn
}

output "shared_alb_dns_name" {
  description = "Shared ALB DNS name"
  value       = module.constellation_service.shared_alb_dns_name
}

# Database
output "database_endpoint" {
  description = "Database endpoint"
  value       = module.constellation_service.database_endpoint
}

output "database_port" {
  description = "Database port"
  value       = module.constellation_service.database_port
}

output "database_name" {
  description = "Database name"
  value       = module.constellation_service.database_name
}

# DNS / HTTPS
output "app_url" {
  description = "Full application URL (https://api.yourdomain.co)"
  value       = module.constellation_service.app_url
}

output "subdomain_fqdn" {
  description = "Fully qualified domain name"
  value       = module.constellation_service.subdomain_fqdn
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = module.constellation_service.certificate_arn
}

output "listener_rule_priority" {
  description = "ALB listener rule priority"
  value       = module.constellation_service.listener_rule_priority
}

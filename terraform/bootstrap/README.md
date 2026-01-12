# Terraform Bootstrap

This folder creates the S3 bucket required for Terraform remote state storage.

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform >= 1.0

## Usage

### 1. Configure AWS Profile

Ensure your AWS profile is set up:

```bash
aws configure --profile your-profile-name
```

### 2. Initialize Terraform

```bash
cd terraform/bootstrap
terraform init
```

### 3. Review the Plan

```bash
terraform plan -var="aws_region=us-east-1"

# Or with a specific AWS profile:
AWS_PROFILE=your-profile-name terraform plan
```

### 4. Apply the Configuration

```bash
# Using default profile
terraform apply

# Using a specific AWS profile
AWS_PROFILE=your-profile-name terraform apply

# Or export the profile for the session
export AWS_PROFILE=your-profile-name
terraform apply
```

### 5. Enable Remote State

After successful apply, uncomment the backend configuration in `terraform/main.tf` and run:

```bash
cd ../
terraform init
```

## Customization

You can override default values:

```bash
terraform apply \
  -var="state_bucket_name=my-custom-bucket" \
  -var="aws_region=us-west-2"
```

## Resources Created

| Resource | Default Name | Purpose |
|----------|--------------|---------|
| S3 Bucket | `constellation-service-tfstate` | Terraform state storage |

## Cleanup

To destroy the bootstrap infrastructure (only if you no longer need remote state):

```bash
AWS_PROFILE=your-profile-name terraform destroy
```

**Warning**: Destroying these resources will make your Terraform state inaccessible.

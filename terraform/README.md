# Notes

## `TF_VAR_APP_SECRETS` example

```json
{
  "BACKOFFICE_SECRET_KEY": "backoffice-access-dev",
  "FRONTEND_ORIGINS": "https://subdomain.your-domain.com",
  "AWS_REGION": "us-east-1",
  "AWS_SES_FROM_EMAIL": "contact@your-domain.co",
  "AWS_ACCESS_KEY_ID": "your_access_key_id",
  "AWS_SECRET_ACCESS_KEY": "your_secret_access_key",
  "OTLP_AUTH_TOKEN": "your-grafana-cloud-token",
  "DATABASE_URL": "postgresql://admin:${DATABASE_PASSWORD}@${DATABASE_HOST}:5432/constellation?schema=public"
}
  ```
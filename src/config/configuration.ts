export const configuration = () => ({
  app: {
    port: parseInt(process.env.SERVICE_PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel:
      process.env.LOG_LEVEL ||
      (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
    federationEnabled: process.env.FEDERATION_ENABLED === 'true',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || '',
  },
  cache: {
    defaultTtlSeconds: parseInt(
      process.env.CACHE_DEFAULT_TTL_SECONDS || '60',
      10,
    ),
  },
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'constellation-service',
    serviceNamespace: process.env.OTEL_SERVICE_NAMESPACE || 'constellation',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    environment:
      process.env.DEPLOYMENT_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
  },
  email: {
    smtpHost: process.env.SMTP_HOST || 'localhost',
    smtpPort: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    fromAddress:
      process.env.EMAIL_FROM_ADDRESS || 'noreply@constellation.local',
    fromName: process.env.EMAIL_FROM_NAME || 'Constellation Service',
  },
  aws: {
    ses: {
      region: process.env.AWS_SES_REGION || '',
      accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY || '',
    },
  },
  auditRetention: {
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90', 10),
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
  },
  cors: {
    frontendOrigins: process.env.FRONTEND_ORIGINS || '',
  },
});

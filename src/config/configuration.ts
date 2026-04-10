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
  otel: {
    serviceName: process.env.OTEL_SERVICE_NAME || 'constellation-service',
    serviceNamespace: process.env.OTEL_SERVICE_NAMESPACE || 'constellation',
    serviceVersion: process.env.OTEL_SERVICE_VERSION || '1.0.0',
    environment:
      process.env.DEPLOYMENT_ENVIRONMENT ||
      process.env.NODE_ENV ||
      'development',
  },
  cors: {
    frontendOrigins: process.env.FRONTEND_ORIGINS || '',
  },
});

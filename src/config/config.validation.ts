import * as Joi from 'joi';

export const configValidationSchema = Joi.object({
  // App
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  SERVICE_PORT: Joi.number().default(3000),
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .optional(),

  // Database
  DATABASE_URL: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),

  // JWT
  JWT_SECRET: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required().messages({
      'any.required':
        'JWT_SECRET is required in production. Do not rely on default secrets.',
    }),
    otherwise: Joi.string().default('dev-secret-do-not-use-in-production'),
  }),

  // CORS
  FRONTEND_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.string()
      .required()
      .custom((value, helpers) => {
        const origins = value
          .split(',')
          .map((o: string) => o.trim())
          .filter(Boolean);
        if (origins.length === 0) {
          return helpers.error('any.invalid');
        }
        return value;
      })
      .messages({
        'any.invalid':
          'FRONTEND_ORIGINS must contain at least one valid origin in production.',
      }),
    otherwise: Joi.optional().default(''),
  }),

  // OpenTelemetry
  OTEL_SERVICE_NAME: Joi.string().optional(),
  OTEL_SERVICE_NAMESPACE: Joi.string().optional(),
  OTEL_SERVICE_VERSION: Joi.string().optional(),
  DEPLOYMENT_ENVIRONMENT: Joi.string().optional(),
  OTLP_ENDPOINT: Joi.string().optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: Joi.string().optional(),
  OTLP_AUTH_TOKEN: Joi.string().optional(),
  OTLP_HOST: Joi.string().optional(),
  OTLP_PORT: Joi.number().optional(),
  OTEL_SDK_DISABLED: Joi.string().optional(),
});
